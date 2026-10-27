import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 2: Errors you can read, then closures. A custom error enum with Display and Error, From and ?,
 * FromStr with line numbers, and closures that capture. Each lesson's text may hold MAIN_DIVIDER
 * (engine/compose.ts): what is above it goes before `fn main()`, what is below it joins main's body.
 */

export const chapter2: Chapter = {
  id: "errors-you-can-read",
  title: "Errors you can read",
  blurb: "Turn \"it did not parse\" into a precise, printable, convertible error, and meet closures along the way.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "rust-inventory-5-error-type",
      title: "An error type with a voice",
      minutes: 45,
      xp: 160,
      concepts: ["error enum", "variants with data", "impl Display", "std::error::Error", "source()", "ParseIntError", "map_err", "E0277"],
      learn: md`### The sketch said "it did not parse". That is not enough.

Lesson 3's \`from_line\` returned an \`Option\`: a line either becomes a record or it becomes \`None\`. A person fixing the notebook needs more: *which* line, *what* was wrong with it, and what it contained. So a function that can fail should return a \`Result<T, E>\` whose \`E\` is a type **you designed** for the job. In Reef Station you wrote a small one with a \`describe\` method. Here is the production version, in three layers: the enum, the text people read (\`Display\`), and the trait that makes it a real error (\`Error\`).

### Layer 1: one variant per kind of failure

~~~rust
use std::num::{ParseFloatError, ParseIntError};

#[derive(Debug)]
enum CatalogError {
    WrongFieldCount { found: usize },
    EmptyName,
    BadInt(ParseIntError),
    BadFloat(ParseFloatError),
    OutOfRange { field: &'static str, value: f64 },
    Duplicate { name: String },
}
~~~

Each variant carries exactly the facts a handler needs and nothing more:

- \`EmptyName\` carries nothing; the name is the problem.
- \`WrongFieldCount { found }\` and \`OutOfRange { field, value }\` use *named fields*, like a struct, so the call site documents itself: \`CatalogError::OutOfRange { field: "declination", value: 99.26 }\`.
- \`BadInt(ParseIntError)\` **wraps the standard library's own error**. The original is kept intact, so nothing is lost and anyone who wants details can ask for them. \`ParseIntError\` and \`ParseFloatError\` are what \`"26OO".parse::<u32>()\` and \`"two".parse::<f64>()\` give you when they fail.
- \`Duplicate\` is not used until lesson 16. An enum cannot be reopened later, so it is declared now.

You can get a real \`ParseIntError\` on demand with \`unwrap_err()\`, which is the opposite of \`unwrap\`: it returns the error from an \`Err\` and panics on \`Ok\`:

~~~rust
let broken = "26OO".parse::<u32>().unwrap_err();
~~~

Do not use \`unwrap_err\` on data you did not write yourself; it is here to build sample errors.

### Layer 2: Display is the text for people

\`#[derive(Debug)]\` prints the structure (\`BadInt(ParseIntError { kind: InvalidDigit })\`): good for logs and tests, wrong for a person. A message for a person is what the **\`Display\`** trait provides, and no type has it until you write it. Try to print an error without it:

~~~text
error[E0277]: \`CatalogError\` doesn't implement \`std::fmt::Display\`
 --> main.rs:6:29
  |
6 |     println!("problem: {}", e);
  |                        --   ^ \`CatalogError\` cannot be formatted with the default formatter
  = note: in format strings you may be able to use \`{:?}\` (or \`{:#?}\` for pretty-print) instead
~~~

Implementing a trait means writing an \`impl TraitName for Type\` block with the methods the trait requires. For \`Display\` that is one method, \`fmt\`:

~~~rust
use std::fmt;

impl fmt::Display for CatalogError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CatalogError::WrongFieldCount { found } => write!(f, "expected 6 fields, found {found}"),
            CatalogError::EmptyName => write!(f, "the star has no name"),
            CatalogError::BadInt(source) => write!(f, "not a whole number ({source})"),
            CatalogError::BadFloat(source) => write!(f, "not a decimal number ({source})"),
            CatalogError::OutOfRange { field, value } => write!(f, "{field} {value} is out of range"),
            CatalogError::Duplicate { name } => write!(f, "{name} is already in the catalogue"),
        }
    }
}
~~~

- \`f\` is where the text goes. \`write!(f, ...)\` is \`format!\` that writes into \`f\` instead of returning a String. It returns the \`fmt::Result\` the function needs, so it is the last expression of each arm (no semicolon).
- The \`match\` must cover every variant, so adding a variant later makes the compiler point at every place that needs a message.
- Because \`Display\` is implemented, the free methods appear: \`error.to_string()\` and \`println!("{error}")\` now work. (\`to_string\` exists for anything that implements \`Display\`.)
- The inner error's \`Display\` is reused inside the parentheses: \`{source}\`.

### Layer 3: the Error trait

~~~rust
use std::error::Error;

impl Error for CatalogError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            CatalogError::BadInt(source) => Some(source),
            CatalogError::BadFloat(source) => Some(source),
            _ => None,
        }
    }
}
~~~

\`std::error::Error\` is the standard marker for "this type is an error". It requires \`Debug\` and \`Display\` (you have both), and all its methods have defaults, so an empty \`impl Error for CatalogError {}\` is already valid. The one worth overriding is \`source()\`: it exposes the **underlying cause**, so a tool can print a chain like "could not read line 7, caused by: invalid digit found in string". Variants with nothing inside answer \`None\`. \`dyn Error + 'static\` is a *trait object*, "some error, I will not say which type"; you will use that idea properly in lesson 6 and the Advanced project.

Why bother? Anything that wants to treat your type as *an error in general* needs the trait. The next lesson uses \`Box<dyn Error>\` and \`?\`, and without \`impl Error\` it fails:

~~~text
error[E0277]: \`?\` couldn't convert the error: \`CatalogError: std::error::Error\` is not satisfied
 --> main.rs:6:30
  |
5 | fn run() -> Result<(), Box<dyn Error>> {
  |             -------------------------- required \`CatalogError: std::error::Error\` because of this
6 |     Err(CatalogError::BadInt)?;
  |     -------------------------^ the trait \`std::error::Error\` is not implemented for \`CatalogError\`
~~~

### Building the error by hand

Until \`?\` does the work for you (next lesson), converting a std error into your variant is a \`map_err\` away:

~~~rust
fn read_distance_by_hand(text: &str) -> Result<u32, CatalogError> {
    text.trim().parse::<u32>().map_err(CatalogError::BadInt)
}
~~~

\`map_err\` transforms the \`Err\` side and leaves \`Ok\` alone. A tuple variant such as \`CatalogError::BadInt\` is itself a function from \`ParseIntError\` to \`CatalogError\`, so it can be passed by name.

### The \`kind\` helper

\`kind()\` returns the variant's name as text. Real code rarely needs that, but the observatory uses it as a label, and it shows the \`{ .. }\` pattern: "this variant, I do not care about its fields".

### Common mistakes

- Printing an error with \`{:?}\` to a person. Debug is for you.
- One variant holding a \`String\` that says everything. Variants with data keep the facts separate, so handlers can choose.
- Forgetting a variant in the \`Display\` match; the compiler tells you at once.
- Ending a \`write!\` arm with a \`;\`. The arm's value is the \`fmt::Result\`.`,
      mission: md`The import will meet six kinds of trouble: a line with the wrong number of fields, a missing name, a distance that is not a whole number, a magnitude that is not a decimal, a coordinate outside the sky, and the same star entered twice. Give each one its own name and its own sentence.

Define \`CatalogError\`, teach it to print itself and to say what caused it, and make sample errors of every kind. The **Error ledger** shows one card per variant with its Display text, its Debug text and a badge when it has a cause.`,
      tasks: [
        "Above the divider add use std::error::Error; use std::fmt; and use std::num::{ParseFloatError, ParseIntError};",
        "Define #[derive(Debug)] enum CatalogError with WrongFieldCount { found: usize }, EmptyName, BadInt(ParseIntError), BadFloat(ParseFloatError), OutOfRange { field: &'static str, value: f64 } and Duplicate { name: String }",
        "Add impl CatalogError with fn kind(&self) -> &'static str returning the variant's name as text (\"WrongFieldCount\", \"EmptyName\", ...)",
        "Implement fmt::Display with these sentences: expected 6 fields, found {found} / the star has no name / not a whole number ({source}) / not a decimal number ({source}) / {field} {value} is out of range / {name} is already in the catalogue",
        "Implement Error for CatalogError with source() returning Some(source) for BadInt and BadFloat and None for the rest; add fn read_distance_by_hand(text: &str) -> Result<u32, CatalogError> using parse::<u32>() and map_err(CatalogError::BadInt)",
        "In main build sample_errors: Vec<CatalogError> with one of each kind (use \"26OO\".parse::<u32>().unwrap_err() and \"two\".parse::<f64>().unwrap_err() for the wrapped errors; found 5, declination 99.26, name Vega) and print one Kind: message line for each",
        "Print the Debug form of the third error ({:?}), then BadInt has a source: true and EmptyName has a source: false (call .source().is_some()), then By hand: followed by the message of read_distance_by_hand(\"26OO\")",
        "Send errorSamples: one Json per error with kind, message, debug (format!(\"{:?}\", error)) and hasSource",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: an error type with a voice. Write these in this part of the file (above main):
// use std::error::Error;   use std::fmt;   use std::num::{ParseFloatError, ParseIntError};
// #[derive(Debug)] enum CatalogError { WrongFieldCount { found: usize }, EmptyName, BadInt(ParseIntError), BadFloat(ParseFloatError),
//                                      OutOfRange { field: &'static str, value: f64 }, Duplicate { name: String } }
// impl CatalogError { fn kind(&self) -> &'static str }       "WrongFieldCount", "EmptyName", "BadInt", "BadFloat", "OutOfRange", "Duplicate"
// impl fmt::Display for CatalogError                          "expected 6 fields, found 5" / "the star has no name" / "not a whole number (invalid digit found in string)"
//                                                             "not a decimal number (...)" / "declination 99.26 is out of range" / "Vega is already in the catalogue"
// impl Error for CatalogError { fn source(&self) -> Option<&(dyn Error + 'static)> }     Some(source) for BadInt and BadFloat, None otherwise
// fn read_distance_by_hand(text: &str) -> Result<u32, CatalogError>      text.trim().parse::<u32>().map_err(CatalogError::BadInt)
${MAIN_DIVIDER}
// let sample_errors: Vec<CatalogError> = vec![ one of each kind, in the order of the enum ];
// for each:  println!("{}: {}", error.kind(), error);          then  println!("{:?}", sample_errors[2]);
// print:  BadInt has a source: true     EmptyName has a source: false       By hand: not a whole number (invalid digit found in string)
// scene("errorSamples", &error_cards)    each card: Json with kind, message, debug (format!("{:?}", error)), hasSource (error.source().is_some())
`,
      solutionAdd: rs`use std::error::Error;
use std::fmt;
use std::num::{ParseFloatError, ParseIntError};

#[derive(Debug)]
enum CatalogError {
    WrongFieldCount { found: usize },
    EmptyName,
    BadInt(ParseIntError),
    BadFloat(ParseFloatError),
    OutOfRange { field: &'static str, value: f64 },
    Duplicate { name: String },
}

impl CatalogError {
    fn kind(&self) -> &'static str {
        match self {
            CatalogError::WrongFieldCount { .. } => "WrongFieldCount",
            CatalogError::EmptyName => "EmptyName",
            CatalogError::BadInt(_) => "BadInt",
            CatalogError::BadFloat(_) => "BadFloat",
            CatalogError::OutOfRange { .. } => "OutOfRange",
            CatalogError::Duplicate { .. } => "Duplicate",
        }
    }
}

impl fmt::Display for CatalogError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CatalogError::WrongFieldCount { found } => write!(f, "expected 6 fields, found {found}"),
            CatalogError::EmptyName => write!(f, "the star has no name"),
            CatalogError::BadInt(source) => write!(f, "not a whole number ({source})"),
            CatalogError::BadFloat(source) => write!(f, "not a decimal number ({source})"),
            CatalogError::OutOfRange { field, value } => write!(f, "{field} {value} is out of range"),
            CatalogError::Duplicate { name } => write!(f, "{name} is already in the catalogue"),
        }
    }
}

impl Error for CatalogError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            CatalogError::BadInt(source) => Some(source),
            CatalogError::BadFloat(source) => Some(source),
            _ => None,
        }
    }
}

fn read_distance_by_hand(text: &str) -> Result<u32, CatalogError> {
    text.trim().parse::<u32>().map_err(CatalogError::BadInt)
}
${MAIN_DIVIDER}
// Lesson 5: a custom error type.
let sample_errors: Vec<CatalogError> = vec![
    CatalogError::WrongFieldCount { found: 5 },
    CatalogError::EmptyName,
    CatalogError::BadInt("26OO".parse::<u32>().unwrap_err()),
    CatalogError::BadFloat("two".parse::<f64>().unwrap_err()),
    CatalogError::OutOfRange { field: "declination", value: 99.26 },
    CatalogError::Duplicate { name: String::from("Vega") },
];
for error in &sample_errors {
    println!("{}: {}", error.kind(), error);
}
println!("{:?}", sample_errors[2]);
println!("BadInt has a source: {}", sample_errors[2].source().is_some());
println!("EmptyName has a source: {}", sample_errors[1].source().is_some());
match read_distance_by_hand("26OO") {
    Ok(light_years) => println!("By hand: {light_years} ly"),
    Err(error) => println!("By hand: {error}"),
}

let error_cards: Vec<Json> = sample_errors
    .iter()
    .map(|error| {
        Json::new()
            .with("kind", error.kind())
            .with("message", error.to_string())
            .with("debug", format!("{:?}", error))
            .with("hasSource", error.source().is_some())
    })
    .collect();
scene("errorSamples", &error_cards);`,
      explanation:
        "The enum gives every failure its own name and its own data. Display turns each variant into a sentence through write!, and Error marks the type as a real error; overriding source() exposes the wrapped ParseIntError or ParseFloatError as the cause. unwrap_err() is a handy way to get genuine std errors for the samples, and map_err(CatalogError::BadInt) shows the manual conversion that ? will automate in the next lesson.",
      hints: [
        { id: "h1", title: "The enum and kind()", content: "#[derive(Debug)] enum CatalogError { WrongFieldCount { found: usize }, EmptyName, BadInt(ParseIntError), BadFloat(ParseFloatError), OutOfRange { field: &'static str, value: f64 }, Duplicate { name: String } } and kind() is a match with one arm per variant: CatalogError::WrongFieldCount { .. } => \"WrongFieldCount\", CatalogError::BadInt(_) => \"BadInt\", and so on." },
        { id: "h2", title: "Display", content: "impl fmt::Display for CatalogError { fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { match self { CatalogError::WrongFieldCount { found } => write!(f, \"expected 6 fields, found {found}\"), ... } } } No semicolon after the write! in each arm." },
        { id: "h3", title: "Error and the samples", content: "impl Error for CatalogError { fn source(&self) -> Option<&(dyn Error + 'static)> { match self { CatalogError::BadInt(source) => Some(source), CatalogError::BadFloat(source) => Some(source), _ => None } } } For the samples: CatalogError::BadInt(\"26OO\".parse::<u32>().unwrap_err())." },
      ],
      tests: [
        {
          id: "t1",
          description: "Every kind of error prints its own sentence",
          assertionCode: js`
const want = [
  "WrongFieldCount: expected 6 fields, found 5",
  "EmptyName: the star has no name",
  "BadInt: not a whole number (invalid digit found in string)",
  "BadFloat: not a decimal number (invalid float literal)",
  "OutOfRange: declination 99.26 is out of range",
  "Duplicate: Vega is already in the catalogue",
];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + '. Print println!("{}: {}", error.kind(), error); for each sample error, and check the sentence in your Display impl.');`,
        },
        {
          id: "t2",
          description: "Debug shows the structure and source() exposes the cause",
          assertionCode: js`
assert(lines.includes("BadInt(ParseIntError { kind: InvalidDigit })"), 'No line is exactly "BadInt(ParseIntError { kind: InvalidDigit })". Print sample_errors[2] with {:?}. The third sample must be CatalogError::BadInt wrapping the error from "26OO".parse::<u32>().unwrap_err().');
assert(lines.includes("BadInt has a source: true"), 'No line is exactly "BadInt has a source: true". Implement Error::source so BadInt and BadFloat return Some(source), then print sample_errors[2].source().is_some(). You need use std::error::Error; in scope.');
assert(lines.includes("EmptyName has a source: false"), 'No line is exactly "EmptyName has a source: false". Variants that wrap nothing should return None from source().');`,
        },
        {
          id: "t3",
          description: "map_err builds the variant by hand",
          assertionCode: js`assert(lines.includes("By hand: not a whole number (invalid digit found in string)"), 'No line is exactly "By hand: not a whole number (invalid digit found in string)". Write read_distance_by_hand with text.trim().parse::<u32>().map_err(CatalogError::BadInt), call it with "26OO" and print the error after "By hand: ".');`,
        },
        {
          id: "t4",
          description: "The observatory receives the error cards",
          assertionCode: js`
const e = scene.errorSamples;
assert(Array.isArray(e) && e.length === 6, 'Send scene("errorSamples", &error_cards); with one card per sample error (6).');
assertEqual(e.map((x) => x.kind).join(","), "WrongFieldCount,EmptyName,BadInt,BadFloat,OutOfRange,Duplicate", "The cards should list the kinds in the order of the enum");
assertEqual(e[2].message, "not a whole number (invalid digit found in string)", "message should be the Display text (error.to_string())");
assert(String(e[2].debug).startsWith("BadInt("), "debug should be format!(\"{:?}\", error)");
assert(e[2].hasSource === true && e[3].hasSource === true && e[0].hasSource === false, "hasSource should be true only for BadInt and BadFloat");`,
        },
      ],
      unlocks: ["ob-variants"],
      checks: [
        {
          prompt: "Why does `println!(\"{}\", error)` fail on a type that only has `#[derive(Debug)]`?",
          question: {
            type: "choice",
            options: ["`{}` needs the `Display` trait, which is never derived; you write it yourself", "`{}` only works on numbers", "Debug types cannot be printed", "The enum must be `pub`"],
            answer: 0,
          },
          explanation: "`{}` uses `Display`, the human-facing format, and `{:?}` uses `Debug`. There is no single obvious human text for a custom type, so the compiler makes you write the `impl fmt::Display` (E0277 otherwise).",
        },
        {
          prompt: "What is `source()` on the `Error` trait for?",
          question: {
            type: "choice",
            options: ["It returns the line of source code that failed", "It exposes the underlying error that caused this one, so tools can print a chain", "It converts the error to a String", "It makes the error public"],
            answer: 1,
          },
          explanation: "`source()` returns `Option<&dyn Error>`: the wrapped cause, if any. A `BadInt` wraps a `ParseIntError`, so it answers `Some`; `EmptyName` wraps nothing, so it answers `None`.",
        },
      ],
    },
    // ───────────────────────── 6 ─────────────────────────
    {
      id: "rust-inventory-6-question-mark",
      title: "? and From: the plumbing",
      minutes: 45,
      xp: 170,
      concepts: ["? operator", "From trait", "impl From", "Box<dyn Error>", "typed vs boxed errors", "matches!", "E0277"],
      learn: md`### What \`?\` really does

You used \`?\` in Reef Station as "return early on failure". Here is the whole story. On a \`Result\`, this line:

~~~rust
let light_years = text.trim().parse::<u32>()?;
~~~

means roughly:

~~~rust
let light_years = match text.trim().parse::<u32>() {
    Ok(value) => value,
    Err(error) => return Err(From::from(error)),     // note From::from
};
~~~

The important part is \`From::from(error)\`. The error that came out of \`parse\` is a \`ParseIntError\`, but this function returns \`Result<u32, CatalogError>\`. \`?\` converts it on the way out, using whatever \`From\` conversion exists. If there is none:

~~~text
error[E0277]: \`?\` couldn't convert the error to \`CatalogError\`
 --> main.rs:5:39
  |
4 | fn parse_dist(text: &str) -> Result<u32, CatalogError> {
  |                              ------------------------- expected \`CatalogError\` because of this
5 |     let d = text.trim().parse::<u32>()?;
  |                         --------------^ the trait \`From<ParseIntError>\` is not implemented for \`CatalogError\`
  = note: the question mark operation (\`?\`) implicitly performs a conversion on the error value using the \`From\` trait
~~~

That message is the whole job description. Provide the conversions once:

~~~rust
impl From<ParseIntError> for CatalogError {
    fn from(source: ParseIntError) -> CatalogError {
        CatalogError::BadInt(source)
    }
}

impl From<ParseFloatError> for CatalogError {
    fn from(source: ParseFloatError) -> CatalogError {
        CatalogError::BadFloat(source)
    }
}
~~~

and every function returning \`Result<_, CatalogError>\` can use \`?\` on both kinds of parse failure, mixed in any order:

~~~rust
fn read_distance(text: &str) -> Result<u32, CatalogError> {
    let light_years = text.trim().parse::<u32>()?;        // ParseIntError -> BadInt
    Ok(light_years)
}

fn read_declination(text: &str) -> Result<f64, CatalogError> {
    let degrees: f64 = text.trim().parse()?;               // ParseFloatError -> BadFloat
    if !rules::dec_ok(degrees) {
        return Err(CatalogError::OutOfRange { field: "declination", value: degrees });
    }
    Ok(degrees)
}
~~~

Compare \`read_distance\` with lesson 5's \`read_distance_by_hand\`: same behaviour, no \`map_err\`. Notice that \`OutOfRange\` is not converted from anything: you build it yourself with \`Err(..)\` where you detect the problem. Your funnel picture, then, has two entrances: conversions through \`?\` and errors you construct.

### A conversion cannot add context

\`From<ParseIntError>\` receives only the error. It cannot know the error came from the *distance* field rather than a year field. That is why \`BadInt\` says "not a whole number" without naming a field. When you need that context, skip the automatic conversion and add it where you still have it:

~~~rust
let light_years = text.parse::<u32>().map_err(|e| /* build a richer variant here */ ...)?;
~~~

Lesson 7 adds the line number at the one place that knows it. Choose where the context gets attached; \`From\` is for conversions that need none.

### Two ways to type an error: pick on purpose

Instead of designing an enum you can return **\`Box<dyn Error>\`**: "some error, boxed on the heap, I will not say which type".

~~~rust
fn quick_check(line: &str) -> Result<f64, Box<dyn Error>> {
    let degrees = read_declination(field(line, 3))?;            // CatalogError -> Box
    let light_years: u32 = field(line, 5).trim().parse()?;       // ParseIntError -> Box
    if light_years == 0 {
        return Err("a distance of zero light years".into());     // &str -> Box
    }
    Ok(degrees)
}
~~~

Any type that implements \`Error\` converts into the box through \`?\`, and even a plain string slice does through \`.into()\`. That is the point: one return type accepts every error without writing a single \`From\`. It is also the limit. Look at what comes back for the line with the broken distance:

~~~text
quick_check Deneb: invalid digit found in string
~~~

The caller got a sentence but no name for the problem, no way to \`match\` on it, and the helpful "not a whole number" wording of the typed version is gone because the box simply kept the std error.

- callers can match on the cause: with the typed enum yes; with \`Box<dyn Error>\` not directly (only by testing with \`downcast_ref\`).
- cost to write: the typed enum needs an enum plus Display and From impls; \`Box<dyn Error>\` needs nothing.
- best for: the typed enum suits libraries, parsers and anything others handle; \`Box<dyn Error>\` suits scripts, \`main\`, quick glue, prototypes.

A good habit: **typed errors inside, boxed errors at the edge.** Your parsing code returns \`CatalogError\`; the top-level function that only wants to print a failure and exit can use the box. Real crates often write \`fn main() -> Result<(), Box<dyn Error>>\` so that \`?\` works in \`main\` itself. This course's \`main\` has a fixed shape, so the boxed function here is a helper called from \`main\`.

If the boxed value is one of yours you can still get it back: \`error.downcast_ref::<CatalogError>()\` returns an \`Option<&CatalogError>\`. Use it sparingly; needing it often means you wanted the typed version.

### A tiny pattern: \`matches!\`

\`matches!(value, Pattern)\` is a macro that answers true or false:

~~~rust
fn converted(&self) -> bool {
    matches!(self, CatalogError::BadInt(_) | CatalogError::BadFloat(_))
}
~~~

It is a \`match\` with the boring \`=> true, _ => false\` written for you. The \`|\` joins alternatives.

### Common mistakes

- Using \`?\` in a function that returns \`()\` (such as \`main\`). The error says the function must return \`Result\` or \`Option\`.
- Writing a \`From\` impl for an error that can mean different things in different places. Use \`map_err\` where you have the context.
- Returning \`Box<dyn Error>\` from a library function and making every caller guess.
- Forgetting that \`Ok(...)\` still needs to be written at the end of a \`?\`-using function.`,
      mission: md`The catalogue has to survive bad data. With a few \`From\` impls the parsing code gets short and the failures arrive already wrapped in your own type. You will also write one quick-and-dirty checker with \`Box<dyn Error>\` to feel the difference.

Run a handful of bad inputs through the conversions and the **Error funnel** shows where each one entered: converted by \`?\` through \`From\`, or built directly by your own check.`,
      tasks: [
        "Above the divider add impl From<ParseIntError> for CatalogError (fn from(source: ParseIntError) -> CatalogError giving BadInt) and the same for ParseFloatError giving BadFloat",
        "Add a second impl CatalogError block with fn converted(&self) -> bool using matches! for BadInt and BadFloat",
        "Write fn read_distance(text: &str) -> Result<u32, CatalogError> using parse::<u32>()? and fn read_declination(text: &str) -> Result<f64, CatalogError> using parse()? and, when rules::dec_ok fails, return Err(CatalogError::OutOfRange { field: \"declination\", value: degrees })",
        "Write fn quick_check(line: &str) -> Result<f64, Box<dyn Error>>: the declination (field 3) through read_declination(..)?, the distance (field 5) parsed with ? into a u32, and Err(\"a distance of zero light years\".into()) when it is 0; return Ok(degrees)",
        "In main run funnel_runs: vec![(\"26OO\", read_distance(\"26OO\").map(f64::from)), (\"two\", read_declination(\"two\")), (\"99.26\", read_declination(\"99.26\")), (\"9\", read_distance(\"9\").map(f64::from))] and print 26OO -> BadInt via From: <message> (via is From when converted() else built), and 9 -> Ok(9) for the good one",
        "Run quick_check on the four lines in the starter and print quick_check Sirius: Ok(-16.72) and, for failures, quick_check Deneb: <the boxed error message>",
        "Send funnel (one Json per run: input, variant, via, message; variant is Ok for the good one with via none) and quickChecks (one Json per quick_check: label, ok, text)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: ? and From. Write these in this part of the file (above main):
// impl From<ParseIntError> for CatalogError   -> CatalogError::BadInt(source)
// impl From<ParseFloatError> for CatalogError -> CatalogError::BadFloat(source)
// impl CatalogError { fn converted(&self) -> bool }                matches!(self, CatalogError::BadInt(_) | CatalogError::BadFloat(_))
// fn read_distance(text: &str) -> Result<u32, CatalogError>        text.trim().parse::<u32>()?
// fn read_declination(text: &str) -> Result<f64, CatalogError>     parse()?, then rules::dec_ok(..) or Err(CatalogError::OutOfRange { field: "declination", value })
// fn quick_check(line: &str) -> Result<f64, Box<dyn Error>>        declination = field 3, distance = field 5 (a u32 with ?), zero distance -> Err("...".into())
${MAIN_DIVIDER}
// let funnel_runs: Vec<(&str, Result<f64, CatalogError>)> = vec![("26OO", read_distance("26OO").map(f64::from)), ("two", read_declination("two")),
//                                                              ("99.26", read_declination("99.26")), ("9", read_distance("9").map(f64::from))];
// print for Err:  26OO -> BadInt via From: not a whole number (invalid digit found in string)     (via is "From" if converted(), else "built")
//        for Ok:  9 -> Ok(9)
// let quick_runs = [("Sirius", "Sirius|Canis Major|6.75|-16.72|-1.46|9"), ("Deneb", "Deneb|Cygnus|20.69|45.28|1.25|26OO"),
//                   ("Polaris", "Polaris|Ursa Minor|2.53|99.26|1.98|430"), ("Ghost", "Ghost|Void|1.0|1.0|9.0|0")];
// print:  quick_check Sirius: Ok(-16.72)       quick_check Deneb: invalid digit found in string  ...
// scene("funnel", &funnel)  (Json: input, variant, via, message)          scene("quickChecks", &quick_checks)  (Json: label, ok, text)
`,
      solutionAdd: rs`impl From<ParseIntError> for CatalogError {
    fn from(source: ParseIntError) -> CatalogError {
        CatalogError::BadInt(source)
    }
}

impl From<ParseFloatError> for CatalogError {
    fn from(source: ParseFloatError) -> CatalogError {
        CatalogError::BadFloat(source)
    }
}

impl CatalogError {
    fn converted(&self) -> bool {
        matches!(self, CatalogError::BadInt(_) | CatalogError::BadFloat(_))
    }
}

fn read_distance(text: &str) -> Result<u32, CatalogError> {
    let light_years = text.trim().parse::<u32>()?;
    Ok(light_years)
}

fn read_declination(text: &str) -> Result<f64, CatalogError> {
    let degrees: f64 = text.trim().parse()?;
    if !rules::dec_ok(degrees) {
        return Err(CatalogError::OutOfRange { field: "declination", value: degrees });
    }
    Ok(degrees)
}

fn quick_check(line: &str) -> Result<f64, Box<dyn Error>> {
    let degrees = read_declination(field(line, 3))?;
    let light_years: u32 = field(line, 5).trim().parse()?;
    if light_years == 0 {
        return Err("a distance of zero light years".into());
    }
    Ok(degrees)
}
${MAIN_DIVIDER}
// Lesson 6: ? and From.
let funnel_runs: Vec<(&str, Result<f64, CatalogError>)> = vec![
    ("26OO", read_distance("26OO").map(f64::from)),
    ("two", read_declination("two")),
    ("99.26", read_declination("99.26")),
    ("9", read_distance("9").map(f64::from)),
];
let mut funnel: Vec<Json> = Vec::new();
for (input, outcome) in &funnel_runs {
    match outcome {
        Ok(value) => {
            println!("{input} -> Ok({value})");
            funnel.push(Json::new().with("input", *input).with("variant", "Ok").with("via", "none").with("message", format!("accepted {value}")));
        }
        Err(error) => {
            let via = if error.converted() { "From" } else { "built" };
            println!("{input} -> {} via {via}: {error}", error.kind());
            funnel.push(Json::new().with("input", *input).with("variant", error.kind()).with("via", via).with("message", error.to_string()));
        }
    }
}
scene("funnel", &funnel);

let quick_runs = [
    ("Sirius", "Sirius|Canis Major|6.75|-16.72|-1.46|9"),
    ("Deneb", "Deneb|Cygnus|20.69|45.28|1.25|26OO"),
    ("Polaris", "Polaris|Ursa Minor|2.53|99.26|1.98|430"),
    ("Ghost", "Ghost|Void|1.0|1.0|9.0|0"),
];
let mut quick_checks: Vec<Json> = Vec::new();
for (label, line) in quick_runs {
    match quick_check(line) {
        Ok(degrees) => {
            println!("quick_check {label}: Ok({degrees})");
            quick_checks.push(Json::new().with("label", label).with("ok", true).with("text", format!("declination {degrees}")));
        }
        Err(error) => {
            println!("quick_check {label}: {error}");
            quick_checks.push(Json::new().with("label", label).with("ok", false).with("text", error.to_string()));
        }
    }
}
scene("quickChecks", &quick_checks);`,
      explanation:
        "? calls From::from on the error before returning it, so the two From impls are all the conversion code the parsing functions need. OutOfRange is not converted from anything: read_declination builds it directly, which is why the funnel marks it 'built'. quick_check returns Box<dyn Error>, which accepts any Error (and strings through into()), but the caller only gets the message back, not a variant to match on.",
      hints: [
        { id: "h1", title: "The From impls", content: "impl From<ParseIntError> for CatalogError { fn from(source: ParseIntError) -> CatalogError { CatalogError::BadInt(source) } } and the same shape for ParseFloatError and BadFloat. Once these exist, text.trim().parse::<u32>()? compiles in a function that returns Result<u32, CatalogError>." },
        { id: "h2", title: "The checkers", content: "read_declination: let degrees: f64 = text.trim().parse()?; if !rules::dec_ok(degrees) { return Err(CatalogError::OutOfRange { field: \"declination\", value: degrees }); } Ok(degrees). quick_check: let light_years: u32 = field(line, 5).trim().parse()?; if light_years == 0 { return Err(\"a distance of zero light years\".into()); }" },
        { id: "h3", title: "Printing the funnel", content: "for (input, outcome) in &funnel_runs { match outcome { Ok(value) => ..., Err(error) => { let via = if error.converted() { \"From\" } else { \"built\" }; println!(\"{input} -> {} via {via}: {error}\", error.kind()); } } } Push a Json::new().with(\"input\", *input).with(\"variant\", error.kind()).with(\"via\", via).with(\"message\", error.to_string()) into funnel." },
      ],
      tests: [
        {
          id: "t1",
          description: "? converts parse errors through From and OutOfRange is built directly",
          assertionCode: js`
const want = [
  "26OO -> BadInt via From: not a whole number (invalid digit found in string)",
  "two -> BadFloat via From: not a decimal number (invalid float literal)",
  "99.26 -> OutOfRange via built: declination 99.26 is out of range",
  "9 -> Ok(9)",
];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + ". Use ? on parse() inside read_distance and read_declination (with the two From impls), and let OutOfRange be built with Err(..) in read_declination. via is From when converted() is true.");`,
        },
        {
          id: "t2",
          description: "Box<dyn Error> accepts every error type and plain text",
          assertionCode: js`
const want = [
  "quick_check Sirius: Ok(-16.72)",
  "quick_check Deneb: invalid digit found in string",
  "quick_check Polaris: declination 99.26 is out of range",
  "quick_check Ghost: a distance of zero light years",
];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + ". quick_check returns Result<f64, Box<dyn Error>>; the distance parse uses ? directly and the zero case returns Err(\"a distance of zero light years\".into()).");`,
        },
        {
          id: "t3",
          description: "The observatory receives the funnel and the quick checks",
          assertionCode: js`
const f = scene.funnel;
assert(Array.isArray(f) && f.length === 4, 'Send scene("funnel", &funnel); with one entry per run (4).');
assertEqual(f.map((x) => x.variant).join(","), "BadInt,BadFloat,OutOfRange,Ok", "variant should be error.kind() for failures and Ok for the good run");
assertEqual(f.map((x) => x.via).join(","), "From,From,built,none", "via should be From for converted errors, built for OutOfRange and none for the Ok run");
assertEqual(f[0].input, "26OO", "input should be the text that was parsed");
const q = scene.quickChecks;
assert(Array.isArray(q) && q.length === 4, 'Send scene("quickChecks", &quick_checks); with one entry per line (4).');
assertEqual(q.map((x) => x.ok).join(","), "true,false,false,false", "ok should be true only for Sirius");
assertEqual(q[1].text, "invalid digit found in string", "text for a failure should be the boxed error's message");`,
        },
      ],
      unlocks: ["ob-funnel"],
      checks: [
        {
          prompt: "A function returns `Result<u32, CatalogError>` and contains `text.parse::<u32>()?`. What must exist for this to compile?",
          question: {
            type: "choice",
            options: ["`impl From<ParseIntError> for CatalogError`", "`impl Display for ParseIntError`", "A `match` around the call", "`CatalogError` must be `Copy`"],
            answer: 0,
          },
          explanation: "`?` converts the error with `From::from`, so `CatalogError` needs a `From<ParseIntError>` implementation. Without one you get E0277: `the trait From<ParseIntError> is not implemented`.",
        },
        {
          prompt: "Your parsing library returns `Result<Record, Box<dyn Error>>`. What is the main drawback for the people who call it?",
          question: {
            type: "choice",
            options: ["It is slower than any other error type", "They cannot easily `match` on which kind of failure happened", "`?` stops working", "It cannot carry a message"],
            answer: 1,
          },
          explanation: "A boxed error hides the concrete type, so callers cannot match on variants without downcasting. Typed errors are better for libraries; the box is great for glue code and `main`.",
        },
      ],
    },
    // ───────────────────────── 7 ─────────────────────────
    {
      id: "rust-inventory-7-fromstr",
      title: "FromStr and errors with line numbers",
      minutes: 45,
      xp: 170,
      concepts: ["FromStr", "str::parse", "newtype", "map_err with a closure", "wrapper error", "Error::source", "enumerate", "why Record can't be FromStr"],
      learn: md`### \`parse\` is a trait in disguise

You have written \`"26".parse::<u32>()\` many times. The turbofish type is the target, and the method is generic over any type that implements the standard trait **\`FromStr\`**:

~~~rust
pub trait FromStr: Sized {
    type Err;
    fn from_str(s: &str) -> Result<Self, Self::Err>;
}
~~~

\`"26".parse::<u32>()\` simply calls \`u32::from_str("26")\`. Implement the trait for your own type and \`parse\` works on it too. The trait has two parts: an **associated type** \`Err\` (the error type this parse can fail with) and the \`from_str\` function.

### A validated number: the newtype pattern

A bare \`f64\` can hold any number, including a magnitude of 4000. Wrap it in a one-field struct and make the only way to build it go through the checks:

~~~rust
use std::str::FromStr;

#[derive(Debug, Clone, Copy)]
struct Magnitude(f64);

impl FromStr for Magnitude {
    type Err = CatalogError;

    fn from_str(text: &str) -> Result<Magnitude, CatalogError> {
        let value: f64 = text.trim().parse()?;           // ParseFloatError -> BadFloat, thanks to lesson 6
        if rules::mag_ok(value) {
            Ok(Magnitude(value))
        } else {
            Err(CatalogError::OutOfRange { field: "magnitude", value })
        }
    }
}

let m: Magnitude = " -1.46 ".parse()?;                  // or "..".parse::<Magnitude>()
~~~

A wrapper like this is called a **newtype**. \`Magnitude\` costs nothing at run time, yet the type system now tells you which numbers have been checked. (\`Magnitude(value)\` is a tuple struct: \`m.0\` reads the inner number.)

### Why \`Record\` does not implement FromStr

It is natural to want \`line.parse::<Record>()\`. Try it:

~~~rust
impl<'a> FromStr for Record<'a> {
    type Err = String;
    fn from_str(line: &str) -> Result<Record<'a>, String> {
        Ok(Record { name: line })
    }
}
~~~

~~~text
error: lifetime may not live long enough
 --> main.rs:7:9
  |
4 | impl<'a> FromStr for Record<'a> {
  |      -- lifetime \`'a\` defined here
6 |     fn from_str(line: &str) -> Result<Record<'a>, String> {
  |                       - let's call the lifetime of this reference \`'1\`
7 |         Ok(Record { name: line })
  |         ^^^^^^^^^^^^^^^^^^^^^^^^^ associated function was supposed to return data with lifetime \`'a\` but it is returning data with lifetime \`'1\`
~~~

The trait's \`from_str(s: &str) -> Result<Self, ..>\` gives the input and the output **unrelated lifetimes**: the standard trait was designed for types that own their data. A type that *borrows* from its input needs its own constructor that says so in the signature, which is what \`Record::from_line\` already does. So the full parser is an ordinary method, and \`FromStr\` is used for the small owned pieces inside it. (The standard \`TryFrom<&'a str>\` trait can express the borrowed case; a named method reads better here.)

### A wrapper that remembers the line

\`Record::parse\` knows what went wrong but not where. The caller knows where. Put the two together in a small struct and make it an error too:

~~~rust
#[derive(Debug)]
struct LineError {
    line: usize,
    error: CatalogError,
}

impl fmt::Display for LineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "line {}: {}", self.line, self.error)
    }
}

impl Error for LineError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.error)               // the cause of a LineError is the CatalogError inside
    }
}

fn parse_numbered(number: usize, line: &str) -> Result<Record<'_>, LineError> {
    Record::parse(line).map_err(|error| LineError { line: number, error })
}
~~~

\`map_err\` takes a **closure** (lesson 8 is about them) that receives the error and returns the new one; the closure also *uses* \`number\` from the surrounding function. The result is an error with layers: "line 4" on the outside, "not a whole number" inside, and the std \`ParseIntError\` as the root. Walking \`source()\` from the outside in would print each layer.

Counting lines: \`enumerate()\` gives 0, 1, 2, ..., so a human-facing line number is \`index + 1\`.

### The parser itself

~~~rust
impl<'a> Record<'a> {
    fn parse(line: &'a str) -> Result<Record<'a>, CatalogError> {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() != 6 {
            return Err(CatalogError::WrongFieldCount { found: parts.len() });
        }
        let name = parts[0].trim();
        if name.is_empty() {
            return Err(CatalogError::EmptyName);
        }
        let ra_hours: f64 = parts[2].trim().parse()?;
        if !rules::ra_ok(ra_hours) {
            return Err(CatalogError::OutOfRange { field: "right ascension", value: ra_hours });
        }
        let dec_deg = read_declination(parts[3])?;
        let magnitude: Magnitude = parts[4].parse()?;
        let distance_ly = read_distance(parts[5])?;
        Ok(Record { name, constellation: parts[1].trim(), ra_hours, dec_deg, magnitude: magnitude.0, distance_ly })
    }
}
~~~

Read it as a checklist, top to bottom, where the first failure leaves immediately. Notice how every kind of check from the last three lessons shows up: a plain \`Err(..)\` where this function detects the problem, \`?\` with a \`From\` conversion on a std parse, a helper from lesson 6 that returns \`CatalogError\`, and \`.parse()?\` that dispatches to your own \`FromStr\`. An \`impl\` block can appear several times for one type, so this second block can sit beside lesson 3's.

### Common mistakes

- Implementing \`FromStr\` for a type that borrows from the input (the lifetime error above).
- Putting the line number inside \`CatalogError\` itself, so every function that makes one needs to know where it is. Wrap at the edge instead.
- Forgetting \`type Err = ...;\` in the impl.
- Reporting \`index\` instead of \`index + 1\` to a human.`,
      mission: md`The importer must stop saying "something is wrong" and start saying "line 4: not a whole number". Add the checked \`Magnitude\`, the full \`Record::parse\` that returns your error type, and a \`LineError\` that stores the line number and chains to the cause.

Feed it seven notebook lines (one fine, six broken in six different ways). The **Line desk** lists each line with its number, a badge and the exact problem.`,
      tasks: [
        "Above the divider add use std::str::FromStr; and #[derive(Debug, Clone, Copy)] struct Magnitude(f64) with impl FromStr (type Err = CatalogError; trim and parse the text with ?, accept it when rules::mag_ok says so, otherwise OutOfRange with field \"magnitude\")",
        "Add #[derive(Debug)] struct LineError { line: usize, error: CatalogError } with impl fmt::Display (line N: <error>) and impl Error whose source() returns Some(&self.error)",
        "In a second impl<'a> Record<'a> block write fn parse(line: &'a str) -> Result<Record<'a>, CatalogError>: collect the | parts; require 6 (WrongFieldCount); an empty trimmed name is EmptyName; right ascension via parse()? then rules::ra_ok else OutOfRange field \"right ascension\"; declination with read_declination(..)?; magnitude with parts[4].parse::<Magnitude>() through ?; distance with read_distance(..)?",
        "Write fn parse_numbered(number: usize, line: &str) -> Result<Record<'_>, LineError> using Record::parse(line).map_err(|error| LineError { line: number, error })",
        "In main loop over the seven notebook lines in the starter with iter().enumerate() (number = index + 1). Print line 1: ok, Vega at 18.62 h for the good one and the LineError (its Display) for the others",
        "Send lineResults: one Json per line with line (the number), text, ok and error (None for the good one, Some(message) otherwise)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: FromStr and line numbers. Write these in this part of the file (above main):
// use std::str::FromStr;
// #[derive(Debug, Clone, Copy)] struct Magnitude(f64);      impl FromStr for Magnitude { type Err = CatalogError; ... rules::mag_ok ... }
// #[derive(Debug)] struct LineError { line: usize, error: CatalogError }
// impl fmt::Display for LineError    "line 4: not a whole number (invalid digit found in string)"
// impl Error for LineError           source() -> Some(&self.error)
// impl<'a> Record<'a> { fn parse(line: &'a str) -> Result<Record<'a>, CatalogError> }      6 parts, name, ra, dec, magnitude (Magnitude), distance
// fn parse_numbered(number: usize, line: &str) -> Result<Record<'_>, LineError>             Record::parse(line).map_err(|error| LineError { line: number, error })
${MAIN_DIVIDER}
// let notebook = [
//     "Vega|Lyra|18.62|38.78|0.03|25",                    "Pollux|Gemini|7.76|28.03|1.14",
//     "|Orion|5.60|-1.20|1.69|2000",                      "Deneb|Cygnus|20.69|45.28|1.25|26OO",
//     "Mizar|Ursa Major|13.40|54.93|two|83",              "Polaris|Ursa Minor|2.53|99.26|1.98|430",
//     "Regulus|Leo|25.14|11.97|1.35|79",
// ];
// for (index, text) in notebook.iter().enumerate() { let number = index + 1; match parse_numbered(number, text) { ... } }
// print:  line 1: ok, Vega at 18.62 h       line 2: expected 6 fields, found 5       line 3: the star has no name   ...
// scene("lineResults", &line_results)   each: Json with line, text, ok, error (None or Some(message))
`,
      solutionAdd: rs`use std::str::FromStr;

#[derive(Debug, Clone, Copy)]
struct Magnitude(f64);

impl FromStr for Magnitude {
    type Err = CatalogError;

    fn from_str(text: &str) -> Result<Magnitude, CatalogError> {
        let value: f64 = text.trim().parse()?;
        if rules::mag_ok(value) {
            Ok(Magnitude(value))
        } else {
            Err(CatalogError::OutOfRange { field: "magnitude", value })
        }
    }
}

#[derive(Debug)]
struct LineError {
    line: usize,
    error: CatalogError,
}

impl fmt::Display for LineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "line {}: {}", self.line, self.error)
    }
}

impl Error for LineError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.error)
    }
}

impl<'a> Record<'a> {
    fn parse(line: &'a str) -> Result<Record<'a>, CatalogError> {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() != 6 {
            return Err(CatalogError::WrongFieldCount { found: parts.len() });
        }
        let name = parts[0].trim();
        if name.is_empty() {
            return Err(CatalogError::EmptyName);
        }
        let ra_hours: f64 = parts[2].trim().parse()?;
        if !rules::ra_ok(ra_hours) {
            return Err(CatalogError::OutOfRange { field: "right ascension", value: ra_hours });
        }
        let dec_deg = read_declination(parts[3])?;
        let magnitude: Magnitude = parts[4].parse()?;
        let distance_ly = read_distance(parts[5])?;
        Ok(Record { name, constellation: parts[1].trim(), ra_hours, dec_deg, magnitude: magnitude.0, distance_ly })
    }
}

fn parse_numbered(number: usize, line: &str) -> Result<Record<'_>, LineError> {
    Record::parse(line).map_err(|error| LineError { line: number, error })
}
${MAIN_DIVIDER}
// Lesson 7: FromStr and line numbers.
let notebook = [
    "Vega|Lyra|18.62|38.78|0.03|25",
    "Pollux|Gemini|7.76|28.03|1.14",
    "|Orion|5.60|-1.20|1.69|2000",
    "Deneb|Cygnus|20.69|45.28|1.25|26OO",
    "Mizar|Ursa Major|13.40|54.93|two|83",
    "Polaris|Ursa Minor|2.53|99.26|1.98|430",
    "Regulus|Leo|25.14|11.97|1.35|79",
];
let mut line_results: Vec<Json> = Vec::new();
for (index, text) in notebook.iter().enumerate() {
    let number = index + 1;
    match parse_numbered(number, text) {
        Ok(record) => {
            println!("line {number}: ok, {} at {} h", record.name, record.ra_hours);
            line_results.push(Json::new().with("line", number).with("text", *text).with("ok", true).with("error", None::<String>));
        }
        Err(problem) => {
            println!("{problem}");
            line_results.push(Json::new().with("line", number).with("text", *text).with("ok", false).with("error", Some(problem.to_string())));
        }
    }
}
scene("lineResults", &line_results);`,
      explanation:
        "Magnitude::from_str is what \"..\".parse::<Magnitude>() calls, and the ? inside it converts the ParseFloatError through the From impl from lesson 6. Record cannot implement FromStr because its borrowed fields need the input's lifetime, so it gets an ordinary method instead. LineError wraps a CatalogError with the line number, and map_err with a closure attaches it at the one place that knows the position.",
      hints: [
        { id: "h1", title: "Magnitude", content: "struct Magnitude(f64); impl FromStr for Magnitude { type Err = CatalogError; fn from_str(text: &str) -> Result<Magnitude, CatalogError> { let value: f64 = text.trim().parse()?; if rules::mag_ok(value) { Ok(Magnitude(value)) } else { Err(CatalogError::OutOfRange { field: \"magnitude\", value }) } } }" },
        { id: "h2", title: "Record::parse", content: "let parts: Vec<&str> = line.split('|').collect(); if parts.len() != 6 { return Err(CatalogError::WrongFieldCount { found: parts.len() }); } then name = parts[0].trim() (EmptyName when empty), ra_hours with parse()? and rules::ra_ok, read_declination(parts[3])?, let magnitude: Magnitude = parts[4].parse()?; read_distance(parts[5])? and finally Ok(Record { name, constellation: parts[1].trim(), ra_hours, dec_deg, magnitude: magnitude.0, distance_ly })." },
        { id: "h3", title: "Numbering the lines", content: "fn parse_numbered(number: usize, line: &str) -> Result<Record<'_>, LineError> { Record::parse(line).map_err(|error| LineError { line: number, error }) } In main: for (index, text) in notebook.iter().enumerate() { let number = index + 1; match parse_numbered(number, text) { Ok(record) => println!(\"line {number}: ok, {} at {} h\", record.name, record.ra_hours), Err(problem) => println!(\"{problem}\") } }" },
      ],
      tests: [
        {
          id: "t1",
          description: "Every notebook line is judged with its number",
          assertionCode: js`
const want = [
  "line 1: ok, Vega at 18.62 h",
  "line 2: expected 6 fields, found 5",
  "line 3: the star has no name",
  "line 4: not a whole number (invalid digit found in string)",
  "line 5: not a decimal number (invalid float literal)",
  "line 6: declination 99.26 is out of range",
  "line 7: right ascension 25.14 is out of range",
];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + ". Print the LineError with {} (its Display writes line N: ...). Check the order of the checks in Record::parse: field count, name, right ascension, declination, magnitude, distance.");`,
        },
        {
          id: "t2",
          description: "The observatory receives the line results",
          assertionCode: js`
const r = scene.lineResults;
assert(Array.isArray(r) && r.length === 7, 'Send scene("lineResults", &line_results); with one entry per notebook line (7).');
assertEqual(r.map((x) => x.line).join(","), "1,2,3,4,5,6,7", "line should be the 1-based line number");
assertEqual(r.map((x) => x.ok).join(","), "true,false,false,false,false,false,false", "ok should be true only for the first line");
assertEqual(r[0].error, null, "error should be None (null) for the good line");
assertEqual(r[3].error, "line 4: not a whole number (invalid digit found in string)", "error should be the LineError text (problem.to_string()) for failed lines");
assertEqual(r[2].text, "|Orion|5.60|-1.20|1.69|2000", "text should be the original notebook line");`,
        },
      ],
      unlocks: ["ob-lines"],
      checks: [
        {
          prompt: "What does `\"-1.46\".parse::<Magnitude>()` call once you have written `impl FromStr for Magnitude`?",
          question: {
            type: "choice",
            options: ["`Magnitude::from_str(\"-1.46\")`", "`Magnitude::new(-1.46)`", "`f64::parse`", "`Display::fmt`"],
            answer: 0,
          },
          explanation: "`str::parse::<T>()` is generic over any `T: FromStr` and simply calls `T::from_str`. Implementing the trait is what makes `parse` work on your own type.",
        },
        {
          prompt: "Why is the line number kept in a wrapper (`LineError`) instead of inside `CatalogError`?",
          question: {
            type: "choice",
            options: ["Enums cannot hold numbers", "Only the caller knows which line it is parsing, so the position is attached at that one place", "`Display` cannot print numbers", "`LineError` is faster"],
            answer: 1,
          },
          explanation: "`Record::parse` sees one line of text and has no idea where it came from. Wrapping at the edge keeps every error constructor simple and still gives the final message its line number.",
        },
      ],
    },
    // ───────────────────────── 8 ─────────────────────────
    {
      id: "rust-inventory-8-closures",
      title: "Closures: Fn, FnMut, FnOnce",
      minutes: 45,
      xp: 170,
      concepts: ["closures", "capture by reference", "move", "Fn / FnMut / FnOnce", "impl Fn", "Box<dyn Fn>", "E0373", "E0596", "E0382"],
      learn: md`### A closure is a function that remembers its surroundings

~~~rust
let cutoff = 0.5;
let is_brilliant = |record: &Record| record.magnitude < cutoff;
~~~

The bars \`| |\` hold the parameters, the rest is the body. Unlike a \`fn\`, a closure may **use variables from the place where it was written**: here \`cutoff\`. Rust works out how each variable is used and captures it in the lightest way that works:

- **by shared reference** if the body only reads it (\`cutoff\` above),
- **by mutable reference** if the body changes it,
- **by value** (a move) if the body consumes it, or if you write \`move\` in front.

Every closure also gets its own unnamed type, and implements one or more of three traits depending on what its body does *with* what it captured:

- \`Fn\`: the body only reads captured values; any number of times, even at the same time.
- \`FnMut\`: the body changes a captured value; any number of times, one at a time; needs \`mut\`.
- \`FnOnce\`: the body moves a captured value out; exactly once.

They nest: every \`Fn\` is also an \`FnMut\`, and every \`FnMut\` is also an \`FnOnce\`. A function that asks for the *weakest* trait it can accept the most closures.

### Fn: just reading

~~~rust
fn count_matching(list: &[Record], test: impl Fn(&Record) -> bool) -> usize {
    list.iter().filter(|record| test(record)).count()
}

let brilliant_count = count_matching(&records, is_brilliant);
~~~

\`impl Fn(&Record) -> bool\` in a parameter position means "any closure or function taking a record and returning a bool". (This is generics in disguise; the Advanced project is about them.) The call \`test(record)\` looks like any function call.

### FnMut: keeping a tally

~~~rust
let mut inspected = 0;
let mut inspect = |record: &Record| {
    inspected += 1;
};
for record in &records {
    inspect(record);
}
println!("{inspected}");
~~~

\`inspected\` is changed through a mutable borrow, so the closure itself must be declared \`mut\`, because calling it changes its captured state. Forget and you get:

~~~text
error[E0596]: cannot borrow \`bump\` as mutable, as it is not declared as mutable
 --> main.rs:5:5
  |
4 |     let bump = || count += 1;
  |                   ----- calling \`bump\` requires mutable binding due to mutable borrow of \`count\`
5 |     bump();
  |     ^^^^ cannot borrow as mutable
help: consider changing this to be mutable
  |
4 |     let mut bump = || count += 1;
  |         +++
~~~

While \`inspect\` is alive, \`inspected\` is mutably borrowed, so reading it in between is refused. Read it after the last call of the closure.

### FnOnce: handing something over

~~~rust
let report_title = String::from("Corvid Peak, night 1");
let seal = move || report_title;       // returns the String itself: moves it out of the closure
let sealed_title = seal();
~~~

Giving a captured \`String\` away can happen only once. A second call is rejected, and the message explains it better than a paragraph could:

~~~text
error[E0382]: use of moved value: \`consume\`
 --> main.rs:6:5
  |
5 |     consume();
  |     --------- \`consume\` moved due to this call
6 |     consume();
  |     ^^^^^^^ value used here after move
note: closure cannot be invoked more than once because it moves the variable \`name\` out of its environment
~~~

A related error appears when you hand such a closure to a function that insists on being able to call it many times (\`Fn\`): *cannot move out of \`name\`, a captured variable in an \`Fn\` closure* (E0507), with a help note spelling out that FnOnce closures may consume things only once.

### \`move\`, and why a returned closure needs it

Writing \`move\` before the bars forces **every** captured variable to be moved (or copied) into the closure. You need it whenever the closure must outlive the place it was made. Returning one is the classic case:

~~~rust
fn make_scaler(factor: f64) -> Box<dyn Fn(f64) -> f64> {
    Box::new(move |value| value * factor)
}
~~~

Without \`move\` the closure would keep a reference to \`factor\`, which is a local of \`make_scaler\` and disappears when it returns:

~~~text
error[E0373]: closure may outlive the current function, but it borrows \`factor\`, which is owned by the current function
 --> main.rs:4:14
  |
4 |     Box::new(|x| x * factor)
  |              ^^^     ------ \`factor\` is borrowed here
  |              |
  |              may outlive borrowed value \`factor\`
help: to force the closure to take ownership of \`factor\` (and any other referenced variables), use the \`move\` keyword
  |
4 |     Box::new(move |x| x * factor)
  |              ++++
~~~

(An \`f64\` is \`Copy\`, so \`move\` copies it in; for a \`String\` it moves the String in.)

### Storing closures: \`Box<dyn Fn>\`

Two closures never have the same type, even if their signatures match, so you cannot put them in one \`Vec\` directly. Box them and name the *trait* instead of the type:

~~~rust
let rack: Vec<(&str, Box<dyn Fn(&Record) -> bool>)> = vec![
    ("brilliant", Box::new(|record: &Record| record.magnitude < 0.5)),
    ("near", Box::new(|record: &Record| record.distance_ly < 20)),
    ("northern", Box::new(|record: &Record| record.dec_deg > 0.0)),
];
~~~

\`dyn Fn(&Record) -> bool\` is a **trait object**: "something callable like this, type erased". The \`Box\` puts it on the heap so every element has the same size. Use \`impl Fn\` when one function takes one closure, and \`Box<dyn Fn>\` when you need to keep different closures in one collection or return one of several. A plain \`fn\` item also works wherever a closure is accepted.

Closures also give the parameter types a check like any function: calling \`is_bright(1)\` where it wants an \`f64\` fails with *mismatched types: expected \`f64\`, found integer*, and suggests \`1.0\`.

### Common mistakes

- Forgetting \`move\` when returning or storing a closure that refers to a local (E0373).
- Declaring a mutating closure without \`mut\` (E0596).
- Reading a variable while a closure that mutates it is still going to be called.
- Calling a closure that moves a value out twice.
- Reaching for \`Box<dyn Fn>\` everywhere; \`impl Fn\` is simpler when it is enough.`,
      mission: md`Each night the astronomers ask the catalogue different questions: how many stars are brilliant, which are near, which are in the northern sky. Rather than write a new loop each time, give the importer a rack of small tools. Some just look, one keeps a tally, one scales hours into degrees, one hands over a title once.

You will write one of each kind of closure and a rack of boxed filters. The **Instrument rack** sorts your closures into Fn, FnMut and FnOnce and counts what each filter matches.`,
      tasks: [
        "Above the divider write fn make_scaler(factor: f64) -> Box<dyn Fn(f64) -> f64> (Box::new(move |value| value * factor)) and fn count_matching(list: &[Record], test: impl Fn(&Record) -> bool) -> usize (filter then count)",
        "In main: let cutoff = 0.5; let is_brilliant = |record: &Record| record.magnitude < cutoff; and print Brilliant stars (magnitude below 0.5): 5 using count_matching(&records, is_brilliant)",
        "Make a tally closure: let mut inspected = 0; let mut near_count = 0; let mut inspect = |record: &Record| { ... }; that adds one to inspected and, for distance_ly below 20, one to near_count. Call it for each record in a for loop and print Inspected 6 stars, 2 within 20 light years",
        "Create let to_degrees = make_scaler(15.0); and print Vega sits at 279.3 degrees using records[3].ra_hours with {:.1}",
        "Create let report_title = String::from(\"Corvid Peak, night 1\"); let seal = move || report_title; and call it once into sealed_title; print Sealed title: Corvid Peak, night 1",
        "Build rack: Vec<(&str, Box<dyn Fn(&Record) -> bool>)> with brilliant (magnitude < 0.5), near (distance_ly < 20) and northern (dec_deg > 0.0), loop over it and print Filter brilliant: 5 stars (then near: 2, northern: 3)",
        "Send closures (four Json: name, kind Fn / FnMut / Fn / FnOnce, captures, result for is_brilliant, inspect, to_degrees and seal) and rack (one Json per filter: filter, matches)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: closures. Write these in this part of the file (above main):
// fn make_scaler(factor: f64) -> Box<dyn Fn(f64) -> f64>                 Box::new(move |value| value * factor)
// fn count_matching(list: &[Record], test: impl Fn(&Record) -> bool) -> usize
${MAIN_DIVIDER}
// let cutoff = 0.5;   let is_brilliant = |record: &Record| record.magnitude < cutoff;      print:  Brilliant stars (magnitude below 0.5): 5
// let mut inspected = 0;  let mut near_count = 0;  let mut inspect = |record: &Record| { ... };    for record in &records { inspect(record); }
// print:  Inspected 6 stars, 2 within 20 light years
// let to_degrees = make_scaler(15.0);        print:  Vega sits at 279.3 degrees          (records[3].ra_hours, one decimal)
// let report_title = String::from("Corvid Peak, night 1");   let seal = move || report_title;   let sealed_title = seal();     print:  Sealed title: Corvid Peak, night 1
// let rack: Vec<(&str, Box<dyn Fn(&Record) -> bool>)> = vec![("brilliant", Box::new(|record: &Record| ...)), ("near", ...), ("northern", ...)];
// print:  Filter brilliant: 5 stars    Filter near: 2 stars    Filter northern: 3 stars
// scene("closures", vec![ Json::new().with("name", "is_brilliant").with("kind", "Fn").with("captures", "cutoff by reference").with("result", ..), ...four ]);   scene("rack", &rack_cards);
`,
      solutionAdd: rs`fn make_scaler(factor: f64) -> Box<dyn Fn(f64) -> f64> {
    Box::new(move |value| value * factor)
}

fn count_matching(list: &[Record], test: impl Fn(&Record) -> bool) -> usize {
    list.iter().filter(|record| test(record)).count()
}
${MAIN_DIVIDER}
// Lesson 8: closures.
let cutoff = 0.5;
let is_brilliant = |record: &Record| record.magnitude < cutoff;
let brilliant_count = count_matching(&records, is_brilliant);
println!("Brilliant stars (magnitude below {cutoff}): {brilliant_count}");

let mut inspected = 0;
let mut near_count = 0;
let mut inspect = |record: &Record| {
    inspected += 1;
    if record.distance_ly < 20 {
        near_count += 1;
    }
};
for record in &records {
    inspect(record);
}
println!("Inspected {inspected} stars, {near_count} within 20 light years");

let to_degrees = make_scaler(15.0);
let vega_degrees = to_degrees(records[3].ra_hours);
println!("Vega sits at {vega_degrees:.1} degrees");

let report_title = String::from("Corvid Peak, night 1");
let seal = move || report_title;
let sealed_title = seal();
println!("Sealed title: {sealed_title}");

let rack: Vec<(&str, Box<dyn Fn(&Record) -> bool>)> = vec![
    ("brilliant", Box::new(|record: &Record| record.magnitude < 0.5)),
    ("near", Box::new(|record: &Record| record.distance_ly < 20)),
    ("northern", Box::new(|record: &Record| record.dec_deg > 0.0)),
];
let mut rack_cards: Vec<Json> = Vec::new();
for (filter_name, test) in &rack {
    let matches = records.iter().filter(|record| test(record)).count();
    println!("Filter {filter_name}: {matches} stars");
    rack_cards.push(Json::new().with("filter", *filter_name).with("matches", matches));
}

scene(
    "closures",
    vec![
        Json::new().with("name", "is_brilliant").with("kind", "Fn").with("captures", "cutoff by reference").with("result", format!("{brilliant_count} stars")),
        Json::new().with("name", "inspect").with("kind", "FnMut").with("captures", "inspected and near_count by mutable reference").with("result", format!("{inspected} inspected, {near_count} near")),
        Json::new().with("name", "to_degrees").with("kind", "Fn").with("captures", "factor moved into a Box").with("result", format!("{vega_degrees:.1}")),
        Json::new().with("name", "seal").with("kind", "FnOnce").with("captures", "report_title moved out").with("result", sealed_title.clone()),
    ],
);
scene("rack", &rack_cards);`,
      explanation:
        "is_brilliant only reads cutoff, so it is Fn and can be passed to count_matching. inspect changes two captured counters, which makes it FnMut and requires let mut. seal moves report_title out when called, which makes it FnOnce. make_scaler needs move because the returned Box<dyn Fn> must own factor after the function ends, and the rack stores three different closures behind the same trait object type.",
      hints: [
        { id: "h1", title: "The two functions", content: "fn make_scaler(factor: f64) -> Box<dyn Fn(f64) -> f64> { Box::new(move |value| value * factor) } and fn count_matching(list: &[Record], test: impl Fn(&Record) -> bool) -> usize { list.iter().filter(|record| test(record)).count() }" },
        { id: "h2", title: "Fn, FnMut, FnOnce", content: "let mut inspect = |record: &Record| { inspected += 1; if record.distance_ly < 20 { near_count += 1; } }; for record in &records { inspect(record); } Read inspected only after the last call. let seal = move || report_title; let sealed_title = seal();" },
        { id: "h3", title: "The rack", content: "let rack: Vec<(&str, Box<dyn Fn(&Record) -> bool>)> = vec![(\"brilliant\", Box::new(|record: &Record| record.magnitude < 0.5)), ...]; for (filter_name, test) in &rack { let matches = records.iter().filter(|record| test(record)).count(); println!(\"Filter {filter_name}: {matches} stars\"); }" },
      ],
      tests: [
        {
          id: "t1",
          description: "The closures produce the right numbers",
          assertionCode: js`
const want = [
  "Brilliant stars (magnitude below 0.5): 5",
  "Inspected 6 stars, 2 within 20 light years",
  "Vega sits at 279.3 degrees",
  "Sealed title: Corvid Peak, night 1",
];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + ". Check each closure: is_brilliant compares magnitude with cutoff, inspect adds to both counters, make_scaler multiplies by the factor, seal returns the title.");`,
        },
        {
          id: "t2",
          description: "The rack of boxed filters counts its matches",
          assertionCode: js`
const want = ["Filter brilliant: 5 stars", "Filter near: 2 stars", "Filter northern: 3 stars"];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + ". Store the filters as Box<dyn Fn(&Record) -> bool> in a Vec of (name, filter) pairs and count the records each one accepts.");`,
        },
        {
          id: "t3",
          description: "The observatory receives the closures and the rack",
          assertionCode: js`
const c = scene.closures;
assert(Array.isArray(c) && c.length === 4, 'Send scene("closures", vec![...]); with four entries: is_brilliant, inspect, to_degrees and seal.');
assertEqual(c.map((x) => x.name).join(","), "is_brilliant,inspect,to_degrees,seal", "The closures should be listed in that order");
assertEqual(c.map((x) => x.kind).join(","), "Fn,FnMut,Fn,FnOnce", "kind should be Fn, FnMut, Fn and FnOnce");
assert(c.every((x) => typeof x.captures === "string" && x.captures.length > 0 && typeof x.result === "string" && x.result.length > 0), "Each entry needs a captures description and a result text.");
const r = scene.rack;
assert(Array.isArray(r) && r.length === 3, 'Send scene("rack", &rack_cards); with one entry per filter (3).');
assertEqual(r.map((x) => x.filter + ":" + x.matches).join(","), "brilliant:5,near:2,northern:3", "rack entries should be filter name and match count");`,
        },
      ],
      unlocks: ["ob-closures"],
      checks: [
        {
          prompt: "A closure changes a variable it captured. Which trait does it implement, and what must you write when you create it?",
          question: {
            type: "choice",
            options: ["`Fn`, nothing special", "`FnMut`, and the closure variable must be `mut`", "`FnOnce`, and it must be `move`", "None, closures cannot change captured variables"],
            answer: 1,
          },
          explanation: "Mutating captured state makes it an `FnMut`. Calling it changes the closure's own state, so the variable that holds it must be declared `mut` (E0596 otherwise).",
        },
        {
          prompt: "Why does `fn make_scaler(factor: f64) -> Box<dyn Fn(f64) -> f64> { Box::new(|x| x * factor) }` fail to compile?",
          question: {
            type: "choice",
            options: ["Closures cannot be returned", "The closure borrows `factor`, a local that is gone when the function returns; `move` copies it into the closure", "`Box` is the wrong type", "`f64` cannot be multiplied"],
            answer: 1,
          },
          explanation: "Without `move` the closure holds a reference to the local `factor` (E0373: closure may outlive the current function). `move` makes the closure own its captured values.",
        },
        {
          prompt: "You need a `Vec` holding three different closures that all take a `&Record` and return a `bool`. What type works?",
          question: {
            type: "choice",
            options: ["`Vec<impl Fn(&Record) -> bool>`", "`Vec<Box<dyn Fn(&Record) -> bool>>`", "`Vec<fn>`", "`Vec<Record>`"],
            answer: 1,
          },
          explanation: "Every closure has its own type, so a `Vec` needs one common type: a boxed trait object, `Box<dyn Fn(&Record) -> bool>`.",
        },
      ],
    },
  ],
};
