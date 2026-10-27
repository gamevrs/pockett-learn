import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 4: Trust the importer. Derived traits and sorting, unit tests, robust stdin and the capstone.
 * Each lesson's text may hold MAIN_DIVIDER (engine/compose.ts): what is above it goes before `fn main()`,
 * what is below it joins main's body.
 */

export const chapter4: Chapter = {
  id: "trust-the-importer",
  title: "Trust the importer",
  blurb: "Order the stars, test the parser, read a messy file without flinching and ship one finished program.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "rust-inventory-13-ordering",
      title: "Derive, Default and sorting",
      minutes: 45,
      xp: 170,
      concepts: ["derive", "PartialEq / Eq", "PartialOrd / Ord", "Default", "struct update syntax", "sort_by", "Ordering", "then / then_with", "Reverse", "total_cmp"],
      learn: md`### Traits for free, and traits by hand

A **trait** is a named set of behaviour a type can have. You have used a few without much ceremony: \`Debug\`, \`Clone\`, \`Display\`, \`Iterator\`, \`FromStr\`, \`Error\`. This lesson is the light version of the rest of the idea (generics and trait objects are the whole Advanced project): the traits that let you **compare**, **sort** and **start from sensible defaults**, which nearly every program needs.

For many traits the compiler can write the implementation for you, if you ask with \`#[derive(..)]\`:

~~~rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Band {
    Brilliant,
    Bright,
    Dim,
}
~~~

What each one gives you:

- \`Debug\` gives you \`{:?}\`: prints the variant or fields.
- \`Clone\` and \`Copy\` give you \`.clone()\` and implicit copies: field by field; \`Copy\` only if every field is \`Copy\`.
- \`PartialEq\` and \`Eq\` give you \`==\`, \`!=\`: equal when **every field** is equal (\`Eq\` promises the comparison is always well defined).
- \`PartialOrd\` and \`Ord\` give you \`<\`, \`>\`, \`cmp\`, \`sort\`: compares field by field in **declaration order**; for an enum, variants compare by their position.
- \`Default\` gives you \`T::default()\`: each field's default: 0, empty string, \`None\`, empty \`Vec\`.

So, for \`Band\`, \`Band::Brilliant < Band::Dim\` is true simply because \`Brilliant\` was written first. That is a design decision hiding in the order of your variants: put them in the order you want them sorted.

Skip a derive and you find out at the first use:

~~~text
error[E0369]: binary operation \`==\` cannot be applied to type \`Star\`
 --> main.rs:6:22
  |
6 |     println!("{}", a == b);
  |                    - ^^ - Star
  |                    |
  |                    Star
note: an implementation of \`PartialEq\` might be missing for \`Star\`
help: consider annotating \`Star\` with \`#[derive(PartialEq)]\`
~~~

~~~text
error[E0277]: \`Star\` doesn't implement \`Debug\`
 --> main.rs:5:22
  |
5 |     println!("{:?}", a);
  |               ----   ^ \`Star\` cannot be formatted using \`{:?}\` because it doesn't implement \`Debug\`
help: consider annotating \`Star\` with \`#[derive(Debug)]\`
~~~

(\`Ord\` needs \`Eq\` and \`PartialOrd\`; \`Eq\` needs \`PartialEq\`. Floats can be \`PartialEq\` and \`PartialOrd\` but never \`Eq\` or \`Ord\`, because of NaN, so a struct with an \`f64\` field can derive \`PartialEq\` and \`PartialOrd\` only.)

### Writing PartialEq yourself

Derive compares everything. Sometimes the right meaning of "same" is narrower. Two sightings of Sirius with slightly different recorded magnitudes are still the same *star*. So implement the trait by hand, comparing only the name:

~~~rust
impl PartialEq for Record<'_> {
    fn eq(&self, other: &Record<'_>) -> bool {
        self.name == other.name
    }
}
~~~

\`!=\` now works for free; the trait provides it. Use this power carefully: if \`==\` and everything else in your program (a hash set, a dedupe step) disagree about identity, the bugs are subtle. Here it is exactly the rule lesson 16 needs.

### Default and struct update

~~~rust
#[derive(Debug, Default)]
struct NightTotals {
    stars: usize,
    total_ly: u32,
    nearest: Option<String>,
    brilliant: usize,
    notes: Vec<String>,
}

let totals = NightTotals {
    stars: 11,
    total_ly: 4098,
    nearest: Some("Sirius".to_string()),
    ..Default::default()           // every field I did not write comes from Default
};
~~~

\`..Default::default()\` at the end of a struct literal is **struct update syntax**: "take the rest from here". The default value is built from each field's own default, so \`brilliant\` is 0, \`nearest\` would be \`None\`, \`notes\` an empty Vec. A struct with many optional settings and a sensible default is far easier to construct this way than with a ten-argument function.

### Sorting with a comparison

\`sort()\` needs \`Ord\`. Strings and integers have it; floats do not, so this fails (the same wall you met with \`max\`):

~~~text
error[E0277]: the trait bound \`{float}: Ord\` is not satisfied
 --> main.rs:6:12
  |
6 |     sorted.sort();
  |            ^^^^ the trait \`Ord\` is not implemented for \`{float}\`
~~~

Say how to compare instead, with \`sort_by\`. Its closure receives two items and returns an **\`Ordering\`**: \`Less\`, \`Equal\` or \`Greater\`. Every \`Ord\` type has \`a.cmp(&b)\` giving one, and floats have \`a.total_cmp(&b)\`.

To sort by several criteria, chain them. \`then\` keeps the first answer unless it was \`Equal\`, and only then looks at the next one. \`then_with\` takes a closure so the second comparison is computed only when needed:

~~~rust
ranked.sort_by(|a, b| {
    Band::of(a.magnitude)
        .cmp(&Band::of(b.magnitude))               // first, by band (Brilliant before Dim)
        .then(a.distance_ly.cmp(&b.distance_ly))   // within a band, the nearest first
});
~~~

Two helpers worth knowing:

- \`sort_by_key(|record| record.distance_ly)\` when one key is enough (the key must be \`Ord\`).
- \`std::cmp::Reverse(key)\` flips a key's order: \`sort_by_key(|record| Reverse(record.distance_ly))\` puts the farthest first.

\`sort\`, \`sort_by\` and \`sort_by_key\` are **stable**: items that compare equal keep their original relative order, which makes multi-pass sorting predictable. They sort in place, so the vector must be \`mut\`.

Notice that \`ranked\` is a \`Vec<&Record>\`: you sort the *references*, leaving the original records and the buffer behind them untouched. Moving pointers is cheaper than moving records.

### Comparing Options

\`Option<&Record>\` compares with \`==\` as long as \`Record: PartialEq\`, so \`repeat_sighting.as_ref() == sheet_records.first()\` asks "is there a record, and is it the same star as the first one?". \`as_ref()\` turns \`&Option<Record>\` into \`Option<&Record>\` without moving anything.

### Common mistakes

- Putting enum variants in an order that does not match the order you want to sort.
- Deriving \`PartialEq\` on a type where equality should mean something narrower.
- \`sort()\` on floats (use \`sort_by\` with \`total_cmp\`).
- Forgetting \`mut\` on the vector being sorted.
- Chaining comparisons with \`then\` but reading the wrong field in the closure.`,
      mission: md`Which star goes first on the observation list? The astronomers have rules: brilliant stars before bright, bright before dim, and inside each band the nearest first because it needs the least exposure time. Encode that as a type (\`Band\`) and a sort, and give the nightly totals a \`Default\` so a quiet night needs no ceremony.

The **Sort desk** lists your ranking with the bands colour-coded, the farthest stars, and the totals card.`,
      tasks: [
        "Above the divider define #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)] enum Band { Brilliant, Bright, Dim } with impl Band { fn of(magnitude: f64) -> Band } (below 0.5 Brilliant, below 1.5 Bright, else Dim)",
        "Implement PartialEq for Record<'_> by hand so two records are equal when their names are equal",
        "Define #[derive(Debug, Default)] struct NightTotals { stars: usize, total_ly: u32, nearest: Option<String>, brilliant: usize, notes: Vec<String> }",
        "In main collect ranked: Vec<&Record> from sheet_records.iter() and sort_by band first (Band::of(..).cmp(..)) then nearest first (distance_ly), and print Ranked: followed by the names joined with \", \"",
        "Collect far_first the same way and sort_by_key with std::cmp::Reverse(record.distance_ly); keep the names of the first three in far_names and print Farthest three: Alnilam, Rigel, Betelgeuse",
        "Print Brilliant comes before Dim: true (compare the variants with <), then parse Sirius's line again with Record::from_line into repeat_sighting and print Same star seen twice: true using repeat_sighting.as_ref() == sheet_records.first()",
        "Build night_totals with stars, total_ly, nearest Some(nearest.to_string()), brilliant (count of Band::Brilliant in ranked) and ..Default::default(); print it with {:?}, then print NightTotals::default() with {:?}",
        "Send ranking (one Json per ranked record: rank, name, band as format!(\"{:?}\", ..), mag, dist), farthest (&far_names) and totals (a Json with stars, totalLy, nearest, brilliant, notes as the length of the notes Vec)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: derive, Default and sorting. Write these in this part of the file (above main):
// #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)] enum Band { Brilliant, Bright, Dim }       impl Band { fn of(magnitude: f64) -> Band }   < 0.5, < 1.5, else
// impl PartialEq for Record<'_> { fn eq(&self, other: &Record<'_>) -> bool }                                same star = same name
// #[derive(Debug, Default)] struct NightTotals { stars: usize, total_ly: u32, nearest: Option<String>, brilliant: usize, notes: Vec<String> }
${MAIN_DIVIDER}
// let mut ranked: Vec<&Record> = sheet_records.iter().collect();    ranked.sort_by(|a, b| Band::of(a.magnitude).cmp(&Band::of(b.magnitude)).then(a.distance_ly.cmp(&b.distance_ly)));
// print:  Ranked: Sirius, Procyon, Capella, Betelgeuse, Rigel, Altair, Pollux, Aldebaran, Regulus, Adhara, Alnilam
// let mut far_first: Vec<&Record> = ...;   far_first.sort_by_key(|record| std::cmp::Reverse(record.distance_ly));     print:  Farthest three: Alnilam, Rigel, Betelgeuse
// print:  Brilliant comes before Dim: true       let repeat_sighting = Record::from_line("Sirius|Canis Major|6.75|-16.72|-1.46|9");
// print:  Same star seen twice: true             (repeat_sighting.as_ref() == sheet_records.first())
// let night_totals = NightTotals { stars: .., total_ly, nearest: Some(nearest.to_string()), brilliant: .., ..Default::default() };     println!("{:?}", night_totals);   println!("{:?}", NightTotals::default());
// scene keys: ranking (Json: rank, name, band, mag, dist)   farthest (names)   totals (Json: stars, totalLy, nearest, brilliant, notes)
`,
      solutionAdd: rs`#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Band {
    Brilliant,
    Bright,
    Dim,
}

impl Band {
    fn of(magnitude: f64) -> Band {
        if magnitude < 0.5 {
            Band::Brilliant
        } else if magnitude < 1.5 {
            Band::Bright
        } else {
            Band::Dim
        }
    }
}

impl PartialEq for Record<'_> {
    fn eq(&self, other: &Record<'_>) -> bool {
        self.name == other.name
    }
}

#[derive(Debug, Default)]
struct NightTotals {
    stars: usize,
    total_ly: u32,
    nearest: Option<String>,
    brilliant: usize,
    notes: Vec<String>,
}
${MAIN_DIVIDER}
// Lesson 13: ordering and equality.
let mut ranked: Vec<&Record> = sheet_records.iter().collect();
ranked.sort_by(|a, b| {
    Band::of(a.magnitude)
        .cmp(&Band::of(b.magnitude))
        .then(a.distance_ly.cmp(&b.distance_ly))
});
let ranked_names: Vec<&str> = ranked.iter().map(|record| record.name).collect();
println!("Ranked: {}", ranked_names.join(", "));

let mut far_first: Vec<&Record> = sheet_records.iter().collect();
far_first.sort_by_key(|record| std::cmp::Reverse(record.distance_ly));
let far_names: Vec<&str> = far_first.iter().take(3).map(|record| record.name).collect();
println!("Farthest three: {}", far_names.join(", "));

println!("Brilliant comes before Dim: {}", Band::Brilliant < Band::Dim);
let repeat_sighting = Record::from_line("Sirius|Canis Major|6.75|-16.72|-1.46|9");
println!("Same star seen twice: {}", repeat_sighting.as_ref() == sheet_records.first());

let night_totals = NightTotals {
    stars: sheet_records.len(),
    total_ly,
    nearest: Some(nearest.to_string()),
    brilliant: ranked.iter().filter(|record| Band::of(record.magnitude) == Band::Brilliant).count(),
    ..Default::default()
};
println!("{:?}", night_totals);
println!("{:?}", NightTotals::default());

scene(
    "ranking",
    ranked
        .iter()
        .enumerate()
        .map(|(index, record)| {
            Json::new()
                .with("rank", index + 1)
                .with("name", record.name)
                .with("band", format!("{:?}", Band::of(record.magnitude)))
                .with("mag", record.magnitude)
                .with("dist", record.distance_ly)
        })
        .collect::<Vec<Json>>(),
);
scene("farthest", &far_names);
scene(
    "totals",
    Json::new()
        .with("stars", night_totals.stars)
        .with("totalLy", night_totals.total_ly)
        .with("nearest", night_totals.nearest.clone())
        .with("brilliant", night_totals.brilliant)
        .with("notes", night_totals.notes.len()),
);`,
      explanation:
        "Band derives Ord, so the variants compare in the order they are declared and cmp on two bands gives the ranking. then() only consults the distance when the bands tie. The hand-written PartialEq says two records are the same star when the names match, which is what the Option comparison with first() uses. ..Default::default() fills the fields you did not write from each field's own default, so notes stays an empty Vec.",
      hints: [
        { id: "h1", title: "Band and the sort", content: "enum Band { Brilliant, Bright, Dim } with the derive list above it. ranked.sort_by(|a, b| Band::of(a.magnitude).cmp(&Band::of(b.magnitude)).then(a.distance_ly.cmp(&b.distance_ly))); The vector must be declared mut." },
        { id: "h2", title: "Reverse and equality", content: "far_first.sort_by_key(|record| std::cmp::Reverse(record.distance_ly)); and impl PartialEq for Record<'_> { fn eq(&self, other: &Record<'_>) -> bool { self.name == other.name } }" },
        { id: "h3", title: "Defaults", content: "NightTotals { stars: sheet_records.len(), total_ly, nearest: Some(nearest.to_string()), brilliant: ranked.iter().filter(|record| Band::of(record.magnitude) == Band::Brilliant).count(), ..Default::default() } The ..Default::default() goes last, with no trailing comma needed." },
      ],
      tests: [
        {
          id: "t1",
          description: "The ranking puts bands first and the nearest star first within a band",
          assertionCode: js`
assert(lines.includes("Ranked: Sirius, Procyon, Capella, Betelgeuse, Rigel, Altair, Pollux, Aldebaran, Regulus, Adhara, Alnilam"), 'No line is exactly "Ranked: Sirius, Procyon, Capella, Betelgeuse, Rigel, Altair, Pollux, Aldebaran, Regulus, Adhara, Alnilam". Sort by Band::of(magnitude) first, then by distance_ly with .then(..). Band must derive Ord and list Brilliant, Bright, Dim in that order.');
assert(lines.includes("Farthest three: Alnilam, Rigel, Betelgeuse"), 'No line is exactly "Farthest three: Alnilam, Rigel, Betelgeuse". Use sort_by_key(|record| std::cmp::Reverse(record.distance_ly)) and take the first three names.');`,
        },
        {
          id: "t2",
          description: "Derived ordering and hand-written equality work",
          assertionCode: js`
assert(lines.includes("Brilliant comes before Dim: true"), 'No line is exactly "Brilliant comes before Dim: true". Print Band::Brilliant < Band::Dim; it needs the derives PartialOrd (and Ord) on Band.');
assert(lines.includes("Same star seen twice: true"), 'No line is exactly "Same star seen twice: true". Implement PartialEq for Record by comparing names, then compare repeat_sighting.as_ref() with sheet_records.first().');`,
        },
        {
          id: "t3",
          description: "Default fills in the fields you leave out",
          assertionCode: js`
assert(lines.includes('NightTotals { stars: 11, total_ly: 4098, nearest: Some("Sirius"), brilliant: 5, notes: [] }'), 'Print night_totals with {:?}. Expected NightTotals { stars: 11, total_ly: 4098, nearest: Some("Sirius"), brilliant: 5, notes: [] }: set stars, total_ly, nearest and brilliant, and let ..Default::default() supply notes.');
assert(lines.includes('NightTotals { stars: 0, total_ly: 0, nearest: None, brilliant: 0, notes: [] }'), 'Print NightTotals::default() with {:?}. The struct must derive Default.');`,
        },
        {
          id: "t4",
          description: "The observatory receives the ranking and totals",
          assertionCode: js`
const r = scene.ranking;
assert(Array.isArray(r) && r.length === 11, 'Send scene("ranking", ...); with one entry per ranked record (11).');
assertEqual(r[0].rank, 1, "rank starts at 1");
assertEqual(r[0].name, "Sirius", "The first ranked star is Sirius");
assertEqual(r[0].band, "Brilliant", "band should be the Debug text of the Band, such as Brilliant");
assertEqual(r[10].band, "Dim", "The last ranked star is Dim");
assert(Array.isArray(scene.farthest) && scene.farthest.join(",") === "Alnilam,Rigel,Betelgeuse", 'Send scene("farthest", &far_names);');
const t = scene.totals;
assert(t && t.stars === 11 && t.totalLy === 4098 && t.nearest === "Sirius" && t.brilliant === 5 && t.notes === 0, 'Send scene("totals", Json::new()...) with stars 11, totalLy 4098, nearest Sirius, brilliant 5 and notes 0.');`,
        },
      ],
      unlocks: ["ob-order"],
      checks: [
        {
          prompt: "`enum Band { Brilliant, Bright, Dim }` derives `PartialOrd`. Which comparison is true?",
          question: {
            type: "choice",
            options: ["`Band::Dim < Band::Brilliant`", "`Band::Brilliant < Band::Dim`", "They are never comparable", "Both are false until you write `impl Ord`"],
            answer: 1,
          },
          explanation: "Derived ordering follows declaration order: the variant written first is the smallest.",
        },
        {
          prompt: "What does `a.x.cmp(&b.x).then(a.y.cmp(&b.y))` do?",
          question: {
            type: "choice",
            options: ["Compares `x`, and only when they are equal decides by `y`", "Compares `y` first", "Adds the two comparisons", "Sorts the list twice"],
            answer: 0,
          },
          explanation: "`then` keeps the first `Ordering` unless it is `Equal`; only a tie falls through to the next comparison.",
        },
        {
          prompt: "Why can a struct with an `f64` field derive `PartialEq` but not `Eq`?",
          question: {
            type: "choice",
            options: ["Floats are too large", "NaN is not equal to itself, so equality is not always well defined (`Eq` promises it is)", "`Eq` is only for strings", "Derive does not work on structs"],
            answer: 1,
          },
          explanation: "`Eq` promises that every value equals itself. `NaN != NaN`, so floats can only be `PartialEq`, and the same reasoning keeps them out of `Ord`.",
        },
      ],
    },
    // ───────────────────────── 14 ─────────────────────────
    {
      id: "rust-inventory-14-tests",
      title: "Unit tests",
      minutes: 50,
      xp: 190,
      concepts: ["#[test]", "#[cfg(test)]", "mod tests", "assert! / assert_eq!", "should_panic", "Result-returning checks", "fn pointers", "a tiny test runner"],
      learn: md`### A test is a function that panics when something is wrong

Rust has testing built into the language and the toolchain. A **unit test** is an ordinary function marked with \`#[test]\`. If it returns normally the test passes; if it **panics** the test fails. The panics come from a few macros:

- \`assert!(condition)\` passes when the condition is true.
- \`assert_eq!(actual, expected)\` passes when the two values are equal (they need \`PartialEq\` and \`Debug\`, so a failure can show both).
- \`assert_ne!(a, b)\` passes when the values differ.
- \`panic!("message")\` never passes: it is an explicit failure.

All of them take an optional message at the end: \`assert!(x > 0, "x was {x}")\`.

### Where tests live: a module that only exists under test

By convention unit tests sit **in the same file as the code**, at the bottom, in a module that is compiled only when testing:

~~~rust
#[cfg(test)]
mod tests {
    use super::*;                      // bring in the parent module's items

    #[test]
    fn parses_a_good_line() {
        let record = Record::parse("Vega|Lyra|18.62|38.78|0.03|25").unwrap();
        assert_eq!(record.name, "Vega");
        assert_eq!(record.distance_ly, 25);
        assert!(record.magnitude < 0.5);
    }

    #[test]
    fn a_short_line_is_rejected() {
        let result = Record::parse("Pollux|Gemini|7.76|28.03|1.14");
        assert!(matches!(result, Err(CatalogError::WrongFieldCount { found: 5 })));
    }

    #[test]
    #[should_panic(expected = "WrongFieldCount")]
    fn unwrapping_a_bad_line_panics() {
        Record::parse("just one field").unwrap();
    }
}
~~~

- \`#[cfg(test)]\` means "compile this only for a test build". The tests cost nothing in the program you ship.
- \`mod tests\` is a normal module (lesson 4), and *because it is a child of the file's root module, it can see even the private items of its parent*. That is why unit tests can test private functions. \`use super::*;\` imports everything from the parent.
- A test name should read as a sentence that says what is true: \`a_short_line_is_rejected\`.
- \`#[should_panic(expected = "text")]\` is the inverse: the test passes only if it panics and the panic message contains the text. It is the way to test "this must fail".
- A test may also return a \`Result\`: \`fn parses() -> Result<(), String> { ... }\`. An \`Err\` fails the test, which lets you use \`?\` inside it.

In a real crate you run them all with \`cargo test\`, and the output looks like this:

~~~text
running 3 tests
test a_short_line_is_rejected ... ok
test parses_a_good_line ... ok
test unwrapping_a_bad_line_panics - should panic ... ok

test result: ok. 3 passed; 0 failed; 0 ignored
~~~

Tests run in parallel, each in its own thread, and a panic is caught per test. Put integration tests (which use your crate from outside, through its public API) in a \`tests/\` directory beside \`src/\`.

### The catch in this course: one file, no \`cargo test\`

Your program is built as a plain single file, and a single-file build does not have a test mode, so the \`#[cfg(test)]\` module above is **never compiled** here. Look at the consequence honestly: a type error inside it would not be reported. Take this module:

~~~rust
#[cfg(test)]
mod tests {
    #[test]
    fn adds() {
        let x: i32 = "not a number";    // an obvious type error
    }
}
~~~

and the program builds and runs without a word. In a real crate \`cargo test\` would catch it. The module's *syntax* is still read, so you can write real test modules in this file and they are exactly what you would ship; but to see the checks actually run here, you also write them as plain functions that return \`Result\`, and add a tiny runner that calls them and prints cargo-style lines. That is a legitimate pattern anywhere you cannot use the test harness (embedded targets, build scripts, examples).

### A check function

~~~rust
fn expect_eq<T: PartialEq + std::fmt::Debug>(what: &str, actual: T, expected: T) -> Result<(), String> {
    if actual == expected {
        Ok(())
    } else {
        Err(format!("{what}: expected {expected:?}, got {actual:?}"))
    }
}

fn check_good_line() -> Result<(), String> {
    let record = Record::parse("Vega|Lyra|18.62|38.78|0.03|25").map_err(|error| error.to_string())?;
    expect_eq("name", record.name, "Vega")?;
    expect_eq("distance", record.distance_ly, 25)?;
    expect_true("band", Band::of(record.magnitude) == Band::Brilliant)
}
~~~

\`expect_eq<T: PartialEq + Debug>\` is the first **generic function** you write: it works for any type \`T\` that can be compared and printed, so one helper checks strings, integers and enums. (You are only using the feature here; the Advanced project explains it properly.) Each check returns \`Ok(())\` on success or an \`Err(String)\` explaining what differed, and chains steps with \`?\`, so the first wrong value ends the check. Matching on the error you expect is the way to test failures:

~~~rust
fn check_short_line() -> Result<(), String> {
    match Record::parse("Pollux|Gemini|7.76|28.03|1.14") {
        Err(CatalogError::WrongFieldCount { found }) => expect_eq("fields found", found, 5),
        other => Err(format!("expected WrongFieldCount, got {other:?}")),
    }
}
~~~

### The runner: a list of (name, function)

~~~rust
type Check = (&'static str, fn() -> Result<(), String>);

fn run_checks(checks: &[Check]) -> Vec<(&'static str, Result<(), String>)> {
    checks.iter().map(|(name, check)| (*name, check())).collect()
}

let checks: Vec<Check> = vec![
    ("parses_a_good_line", check_good_line),
    ("a_short_line_is_rejected", check_short_line),
];
~~~

\`fn() -> Result<(), String>\` is a **function pointer** type: any plain function with that signature, by name. A \`type\` alias gives the pair a short name. The runner calls each check and keeps its outcome; main prints \`test NAME ... ok\` or \`FAILED\` and the totals. When a check fails, the message tells you what to fix, for example \`distance: expected 25, got 52\`.

### What to test

- **One behaviour per test**, named after it. When it fails, the name alone tells you what broke.
- **The good path and each bad path**: this parser has five ways to fail, so it deserves at least five tests, each pinned to a variant.
- **Edges**: an empty name, a coordinate exactly at the limit, a value just beyond it.
- Test the contract (inputs and outputs), not the inner steps, so you can refactor without rewriting the tests.

### Common mistakes

- Forgetting \`#[test]\` (the function silently never runs).
- \`assert_eq!\` on a type without \`PartialEq\` or \`Debug\` (E0369 or E0277).
- Tests that depend on each other or on global state; they run in parallel.
- Leaving a \`#[cfg(test)]\` module type-broken because nothing complained (here, specifically).`,
      mission: md`An importer nobody can trust is worse than none. Before Corvid Peak publishes a catalogue built from your parser, the parser needs a safety net: tests for the good line and for each way a line can be bad.

Write the real \`#[test]\` module as it would appear in a crate, then the six plain checks and a small runner so the observatory can show a **Test results** panel: one line per check, ok or FAILED, and a summary bar.`,
      tasks: [
        "Above the divider write generic helpers fn expect_eq<T: PartialEq + std::fmt::Debug>(what: &str, actual: T, expected: T) -> Result<(), String> (message: {what}: expected {expected:?}, got {actual:?}) and fn expect_true(what: &str, condition: bool) -> Result<(), String>",
        "Write six checks returning Result<(), String>: check_good_line (Vega parses: name, distance 25, brilliant band), check_short_line (WrongFieldCount found 5), check_empty_name, check_bad_distance (BadInt), check_declination_range (OutOfRange with field \"declination\") and check_band_order (Brilliant < Bright < Dim)",
        "Add the real tests module: #[cfg(test)] mod tests { use super::*; ... } with #[test] functions parses_a_good_line, a_short_line_is_rejected (assert! with matches!) and a #[should_panic(expected = \"WrongFieldCount\")] test that unwraps a bad line",
        "Define type Check = (&'static str, fn() -> Result<(), String>); and fn run_checks(checks: &[Check]) -> Vec<(&'static str, Result<(), String>)> that calls each check",
        "In main build checks: Vec<Check> with the six names parses_a_good_line, a_short_line_is_rejected, an_empty_name_is_rejected, a_bad_distance_is_converted, declination_is_range_checked and bands_sort_brightest_first, run them, and print test NAME ... ok (or ... FAILED: message) for each plus test result: 6 passed; 0 failed",
        "Send tests (one Json per outcome: name, ok, message with an empty text on success) and testSummary (passed and failed counts)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: unit tests. Write these in this part of the file (above main):
// fn expect_eq<T: PartialEq + std::fmt::Debug>(what: &str, actual: T, expected: T) -> Result<(), String>      "{what}: expected {expected:?}, got {actual:?}"
// fn expect_true(what: &str, condition: bool) -> Result<(), String>
// six checks (each -> Result<(), String>), each parsing one line with Record::parse:
//   check_good_line            "Vega|Lyra|18.62|38.78|0.03|25": name Vega, distance 25, Band::of(magnitude) == Band::Brilliant
//   check_short_line           "Pollux|Gemini|7.76|28.03|1.14"      -> Err(CatalogError::WrongFieldCount { found }) with found 5
//   check_empty_name           "|Orion|5.60|-1.20|1.69|2000"        -> Err(CatalogError::EmptyName)
//   check_bad_distance         "Deneb|Cygnus|20.69|45.28|1.25|26OO"  -> Err(CatalogError::BadInt(_))
//   check_declination_range    "Polaris|Ursa Minor|2.53|99.26|1.98|430" -> Err(CatalogError::OutOfRange { field, .. }) with field "declination"
//   check_band_order           Band::Brilliant < Band::Bright && Band::Bright < Band::Dim
// #[cfg(test)] mod tests { use super::*;  #[test] fn parses_a_good_line() {..}  #[test] fn a_short_line_is_rejected() {..}  #[test] #[should_panic(expected = "WrongFieldCount")] fn unwrapping_a_bad_line_panics() {..} }
// type Check = (&'static str, fn() -> Result<(), String>);     fn run_checks(checks: &[Check]) -> Vec<(&'static str, Result<(), String>)>
${MAIN_DIVIDER}
// let checks: Vec<Check> = vec![("parses_a_good_line", check_good_line), ("a_short_line_is_rejected", check_short_line), ("an_empty_name_is_rejected", check_empty_name),
//     ("a_bad_distance_is_converted", check_bad_distance), ("declination_is_range_checked", check_declination_range), ("bands_sort_brightest_first", check_band_order)];
// let outcomes = run_checks(&checks);     loop and print:  test parses_a_good_line ... ok      (or  test NAME ... FAILED: message)
// print:  test result: 6 passed; 0 failed
// scene("tests", ...Vec<Json> with name, ok, message)       scene("testSummary", Json::new().with("passed", passed).with("failed", ..))
`,
      solutionAdd: rs`fn expect_eq<T: PartialEq + std::fmt::Debug>(what: &str, actual: T, expected: T) -> Result<(), String> {
    if actual == expected {
        Ok(())
    } else {
        Err(format!("{what}: expected {expected:?}, got {actual:?}"))
    }
}

fn expect_true(what: &str, condition: bool) -> Result<(), String> {
    if condition {
        Ok(())
    } else {
        Err(format!("{what}: expected true, got false"))
    }
}

fn check_good_line() -> Result<(), String> {
    let record = Record::parse("Vega|Lyra|18.62|38.78|0.03|25").map_err(|error| error.to_string())?;
    expect_eq("name", record.name, "Vega")?;
    expect_eq("distance", record.distance_ly, 25)?;
    expect_true("band", Band::of(record.magnitude) == Band::Brilliant)
}

fn check_short_line() -> Result<(), String> {
    match Record::parse("Pollux|Gemini|7.76|28.03|1.14") {
        Err(CatalogError::WrongFieldCount { found }) => expect_eq("fields found", found, 5),
        other => Err(format!("expected WrongFieldCount, got {other:?}")),
    }
}

fn check_empty_name() -> Result<(), String> {
    match Record::parse("|Orion|5.60|-1.20|1.69|2000") {
        Err(CatalogError::EmptyName) => Ok(()),
        other => Err(format!("expected EmptyName, got {other:?}")),
    }
}

fn check_bad_distance() -> Result<(), String> {
    match Record::parse("Deneb|Cygnus|20.69|45.28|1.25|26OO") {
        Err(CatalogError::BadInt(_)) => Ok(()),
        other => Err(format!("expected BadInt, got {other:?}")),
    }
}

fn check_declination_range() -> Result<(), String> {
    match Record::parse("Polaris|Ursa Minor|2.53|99.26|1.98|430") {
        Err(CatalogError::OutOfRange { field, .. }) => expect_eq("field", field, "declination"),
        other => Err(format!("expected OutOfRange, got {other:?}")),
    }
}

fn check_band_order() -> Result<(), String> {
    expect_true("Brilliant < Bright < Dim", Band::Brilliant < Band::Bright && Band::Bright < Band::Dim)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_good_line() {
        let record = Record::parse("Vega|Lyra|18.62|38.78|0.03|25").unwrap();
        assert_eq!(record.name, "Vega");
        assert_eq!(record.distance_ly, 25);
        assert!(record.magnitude < 0.5);
    }

    #[test]
    fn a_short_line_is_rejected() {
        let result = Record::parse("Pollux|Gemini|7.76|28.03|1.14");
        assert!(matches!(result, Err(CatalogError::WrongFieldCount { found: 5 })));
    }

    #[test]
    #[should_panic(expected = "WrongFieldCount")]
    fn unwrapping_a_bad_line_panics() {
        Record::parse("just one field").unwrap();
    }
}

type Check = (&'static str, fn() -> Result<(), String>);

fn run_checks(checks: &[Check]) -> Vec<(&'static str, Result<(), String>)> {
    checks.iter().map(|(name, check)| (*name, check())).collect()
}
${MAIN_DIVIDER}
// Lesson 14: tests.
let checks: Vec<Check> = vec![
    ("parses_a_good_line", check_good_line),
    ("a_short_line_is_rejected", check_short_line),
    ("an_empty_name_is_rejected", check_empty_name),
    ("a_bad_distance_is_converted", check_bad_distance),
    ("declination_is_range_checked", check_declination_range),
    ("bands_sort_brightest_first", check_band_order),
];
let outcomes = run_checks(&checks);
let mut passed = 0;
for (name, outcome) in &outcomes {
    match outcome {
        Ok(()) => {
            passed += 1;
            println!("test {name} ... ok");
        }
        Err(message) => println!("test {name} ... FAILED: {message}"),
    }
}
println!("test result: {passed} passed; {} failed", outcomes.len() - passed);

scene(
    "tests",
    outcomes
        .iter()
        .map(|(name, outcome)| Json::new().with("name", *name).with("ok", outcome.is_ok()).with("message", outcome.clone().err().unwrap_or_default()))
        .collect::<Vec<Json>>(),
);
scene("testSummary", Json::new().with("passed", passed).with("failed", outcomes.len() - passed));`,
      explanation:
        "The #[cfg(test)] module is the real, shippable form of the tests but is not compiled in this single-file build, so the six check functions repeat the same assertions as Result-returning functions. expect_eq is generic over any T that can be compared and printed. run_checks calls each function pointer and keeps its outcome, and main prints cargo-style lines from them, so a failing check would show up as FAILED with its message.",
      hints: [
        { id: "h1", title: "The helpers and one check", content: "fn expect_eq<T: PartialEq + std::fmt::Debug>(what: &str, actual: T, expected: T) -> Result<(), String> { if actual == expected { Ok(()) } else { Err(format!(\"{what}: expected {expected:?}, got {actual:?}\")) } } Then fn check_good_line() -> Result<(), String> { let record = Record::parse(\"Vega|Lyra|18.62|38.78|0.03|25\").map_err(|error| error.to_string())?; expect_eq(\"name\", record.name, \"Vega\")?; ... }" },
        { id: "h2", title: "Testing a failure", content: "match Record::parse(\"Pollux|Gemini|7.76|28.03|1.14\") { Err(CatalogError::WrongFieldCount { found }) => expect_eq(\"fields found\", found, 5), other => Err(format!(\"expected WrongFieldCount, got {other:?}\")) } Use the same shape for EmptyName, BadInt(_) and OutOfRange { field, .. }." },
        { id: "h3", title: "Runner and printing", content: "type Check = (&'static str, fn() -> Result<(), String>); fn run_checks(checks: &[Check]) -> Vec<(&'static str, Result<(), String>)> { checks.iter().map(|(name, check)| (*name, check())).collect() } In main loop over &outcomes with match outcome { Ok(()) => { passed += 1; println!(\"test {name} ... ok\"); } Err(message) => println!(\"test {name} ... FAILED: {message}\") }" },
      ],
      tests: [
        {
          id: "t1",
          description: "Every check runs and passes",
          assertionCode: js`
const names = ["parses_a_good_line", "a_short_line_is_rejected", "an_empty_name_is_rejected", "a_bad_distance_is_converted", "declination_is_range_checked", "bands_sort_brightest_first"];
const missing = names.filter((n) => !lines.includes("test " + n + " ... ok"));
assert(missing.length === 0, "These checks did not print ok: " + missing.join(", ") + '. Print println!("test {name} ... ok"); for every check that returns Ok(()). If one printed FAILED instead, its message says what differed.');
assert(lines.includes("test result: 6 passed; 0 failed"), 'No line is exactly "test result: 6 passed; 0 failed". Count the passes while looping over the outcomes.');`,
        },
        {
          id: "t2",
          description: "The observatory receives the test results",
          assertionCode: js`
const t = scene.tests;
assert(Array.isArray(t) && t.length === 6, 'Send scene("tests", ...); with one entry per check (6).');
assertEqual(t[0].name, "parses_a_good_line", "The first test should be parses_a_good_line");
assert(t.every((x) => x.ok === true), "Every test entry should have ok true");
assert(t.every((x) => typeof x.message === "string"), "Every entry needs a message text (empty when the test passed).");
const s = scene.testSummary;
assert(s && s.passed === 6 && s.failed === 0, 'Send scene("testSummary", Json::new().with("passed", ..).with("failed", ..)); with 6 passed and 0 failed.');`,
        },
      ],
      unlocks: ["ob-tests"],
      checks: [
        {
          prompt: "How does a `#[test]` function report failure?",
          question: {
            type: "choice",
            options: ["It returns false", "It panics (or returns an `Err`)", "It prints FAILED itself", "It calls `std::process::exit(1)`"],
            answer: 1,
          },
          explanation: "The test harness catches the panic from a failed `assert!`/`assert_eq!` and marks that test failed. Returning an `Err` from a test that returns `Result` also fails it.",
        },
        {
          prompt: "Why can unit tests in `mod tests` call private functions of the file they test?",
          question: {
            type: "choice",
            options: ["`#[cfg(test)]` turns privacy off", "`mod tests` is a child module, and children can see their parent's private items", "Test functions are always `pub`", "Private functions are not really private"],
            answer: 1,
          },
          explanation: "Privacy is by module: an item is visible in its own module and in the modules nested inside it. `mod tests` is nested in the file's root, so `use super::*;` reaches everything there.",
        },
        {
          prompt: "In this single-file course, what happens to a type error inside the `#[cfg(test)] mod tests` block?",
          question: {
            type: "choice",
            options: ["The build fails and points at it", "Nothing: the block is not compiled without a test build, so it goes unnoticed", "It becomes a warning", "The program panics when run"],
            answer: 1,
          },
          explanation: "`#[cfg(test)]` code is only compiled by `cargo test`. In a plain build the module is skipped, which is why the plain `Result` checks and the little runner exist here.",
        },
      ],
    },
    // ───────────────────────── 15 ─────────────────────────
    {
      id: "rust-inventory-15-stdin",
      title: "Reading a messy file without flinching",
      minutes: 45,
      xp: 180,
      concepts: ["io::stdin", "read_to_string", "use std::io::Read", "trim", "comments and blanks", "aggregate errors", "struct Import<'a>", "keeping the buffer alive"],
      learn: md`### The real input

So far every lesson used text typed into the program. The real importer receives a **file**, and files are untidy: comment lines, blank lines, stray spaces, a record someone smudged. The input your program reads now has 26 lines. Most are fine. Some are not. The importer's job is to read it all, keep every good record, and report *every* problem, not just the first.

### Getting the text in

Standard input is a stream the program reads from. Three ways to read it, from simplest to most flexible:

~~~rust
use std::io::{self, Read};

let mut file_text = String::new();
io::stdin().read_to_string(&mut file_text);      // everything, into one String
~~~

- \`read_line(&mut s)\` reads one line at a time (what Reef Station used).
- \`io::stdin().lock().lines()\` is an iterator of \`io::Result<String>\`: each item is a **new owned String**.
- \`read_to_string\` pulls in the whole stream.

All three return an \`io::Result\`, because reading can fail. Do not ignore it:

~~~rust
if let Err(problem) = io::stdin().read_to_string(&mut file_text) {
    println!("Could not read the log: {problem}");
}
~~~

\`if let Err(problem) = ...\` is a \`match\` that only cares about one arm; it runs the block when the result is an \`Err\`.

If you forget the import, the error points straight at it, because \`read_to_string\` comes from the \`Read\` trait and trait methods are only available when the trait is in scope:

~~~text
error[E0599]: no method named \`read_to_string\` found for struct \`Stdin\` in the current scope
 --> main.rs:5:17
  |
5 |     io::stdin().read_to_string(&mut text).unwrap();
  |                 ^^^^^^^^^^^^^^
  = help: items from traits can only be used if the trait is in scope
help: trait \`Read\` which provides \`read_to_string\` is implemented but not in scope; perhaps you want to import it
  |
2 + use std::io::Read;
~~~

### Why read everything first?

Here is where lifetimes come back. \`Record<'a>\` borrows from the text it was cut from. With \`lines()\` on stdin each line is a separate temporary String that is dropped at the end of the loop body, so a record borrowing from it could not survive the iteration. With **one String that lives for the whole of \`main\`**, every record can borrow from it and still be valid when you report at the end. The buffer is the owner; the records are views. That is the design you built in lessons 1 to 3, now doing its job.

### Tolerating the mess

Per line, in order:

~~~rust
for (index, raw) in text.lines().enumerate() {
    let line = raw.trim();                    // a view of the line without the surrounding spaces
    if line.is_empty() { /* blank */ continue; }
    if line.starts_with('#') { /* comment */ continue; }
    match parse_numbered(index + 1, line) { /* record or problem */ }
}
~~~

- \`lines()\` splits on \`\n\` and also removes a trailing \`\r\`, so files from Windows read the same.
- \`trim()\` handles the indented line (\`  Rigel|...\`). It returns a slice of the same buffer, no copy.
- The **line number is the index in the whole file**, comments and blanks included, so it matches what a person sees in an editor. That is why the counter comes from \`enumerate()\` over *all* lines, and why filtering lines out before numbering them would give wrong numbers.
- \`continue\` skips to the next iteration.

### Do not stop at the first error

In lesson 10 you collected into \`Result<Vec<_>, _>\` and got one error. For an import you want the opposite: **all the good records and all the errors**. Use two vectors and a \`match\`:

~~~rust
match parse_numbered(index + 1, line) {
    Ok(record) => found.records.push(record),
    Err(problem) => found.problems.push(problem),
}
~~~

Grouped in one struct that is returned to the caller:

~~~rust
struct Import<'a> {
    records: Vec<Record<'a>>,
    problems: Vec<LineError>,
    kinds: Vec<&'static str>,        // one label per input line: "comment", "blank", "record" or "error"
}

fn import(text: &str) -> Import<'_> { /* the loop above */ }
~~~

Look at the return type. \`Import<'_>\` says: "the import borrows from the text you gave me", and elision (lesson 3, rule 2) ties it to the single input. The \`problems\` hold owned errors (they copy what they need), but the \`records\` hold views, so the buffer must outlive the \`Import\`. In \`main\`, \`file_text\` is declared first and dropped last, which is exactly right.

A small method makes the statistics easy:

~~~rust
impl Import<'_> {
    fn count_of(&self, kind: &str) -> usize {
        self.kinds.iter().filter(|label| **label == kind).count()
    }
}
~~~

(\`label\` is a reference to a \`&str\` here, hence the double star on one side of the comparison.)

### Reporting well

A good importer ends with a summary, then the details of what was rejected, each with its line number:

~~~text
Read 26 lines: 3 comments, 2 blank, 21 candidates
16 records accepted, 5 lines rejected
  line 15: expected 6 fields, found 5
  line 19: not a whole number (invalid digit found in string)
  ...
~~~

Real command-line tools also set a non-zero **exit code** when anything was rejected (\`std::process::exit(1)\`) so scripts can react. This course's program ends normally, but you now know the shape.

### Common mistakes

- Using \`?\` to bail out of the whole loop on the first bad line.
- Numbering lines after filtering out comments and blanks.
- Reading line by line into a temporary String and keeping records that borrow from it (the compiler stops you: E0597).
- Calling \`unwrap()\` on the read: a closed or broken input becomes a panic.
- Forgetting \`use std::io::Read;\`.`,
      mission: md`Tonight the importer meets the real night log: 26 lines with notebook headers, blank gaps, an indented entry, a smudged record and five other broken lines. Read the lot into one String, walk it line by line, keep every good record and collect every complaint with its line number.

The **Intake bench** shows the whole file as a strip of coloured lines (comments, blanks, records, rejects), the counts, and the aggregated problems.`,
      tasks: [
        "Above the divider add use std::io::{self, Read}; and struct Import<'a> { records: Vec<Record<'a>>, problems: Vec<LineError>, kinds: Vec<&'static str> } with impl Import<'_> { fn count_of(&self, kind: &str) -> usize }",
        "Write fn import(text: &str) -> Import<'_>: for every line (enumerate) trim it; blank lines push the kind \"blank\", lines starting with '#' push \"comment\"; otherwise match parse_numbered(index + 1, line): Ok pushes the record and \"record\", Err pushes the problem and \"error\"",
        "In main read the whole input: let mut file_text = String::new(); and read_to_string, printing Could not read the log: ... if it fails. Then let first_pass = import(&file_text);",
        "Print Read 26 lines: 3 comments, 2 blank, 21 candidates (candidates are records plus errors) and 16 records accepted, 5 lines rejected from first_pass",
        "Print each problem indented by two spaces, e.g.   line 15: expected 6 fields, found 5",
        "Send fileLines (one Json per input line zipped with first_pass.kinds: n starting at 1, kind and text), intake (read, comments, blanks, accepted, rejected) and problems (the problems as Strings)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: reading the night log. Write these in this part of the file (above main):
// use std::io::{self, Read};
// struct Import<'a> { records: Vec<Record<'a>>, problems: Vec<LineError>, kinds: Vec<&'static str> }
// impl Import<'_> { fn count_of(&self, kind: &str) -> usize }              how many entries of kinds equal kind
// fn import(text: &str) -> Import<'_>       for (index, raw) in text.lines().enumerate(): trim; blank -> "blank"; starts_with('#') -> "comment"; else parse_numbered(index + 1, line) -> "record" or "error"
${MAIN_DIVIDER}
// let mut file_text = String::new();     io::stdin().read_to_string(&mut file_text) (report an Err with  Could not read the log: ..)
// let first_pass = import(&file_text);
// print:  Read 26 lines: 3 comments, 2 blank, 21 candidates        16 records accepted, 5 lines rejected        then each problem as   "  line 15: expected 6 fields, found 5"
// scene("fileLines", ...)  Json per input line: n (from 1), kind (from first_pass.kinds), text         (file_text.lines().zip(&first_pass.kinds).enumerate())
// scene("intake", Json::new().with("read", ..).with("comments", ..).with("blanks", ..).with("accepted", ..).with("rejected", ..));      scene("problems", the problem texts as Vec<String>)
`,
      solutionAdd: rs`use std::io::{self, Read};

struct Import<'a> {
    records: Vec<Record<'a>>,
    problems: Vec<LineError>,
    kinds: Vec<&'static str>,
}

impl Import<'_> {
    fn count_of(&self, kind: &str) -> usize {
        self.kinds.iter().filter(|label| **label == kind).count()
    }
}

fn import(text: &str) -> Import<'_> {
    let mut found = Import { records: Vec::new(), problems: Vec::new(), kinds: Vec::new() };
    for (index, raw) in text.lines().enumerate() {
        let line = raw.trim();
        if line.is_empty() {
            found.kinds.push("blank");
            continue;
        }
        if line.starts_with('#') {
            found.kinds.push("comment");
            continue;
        }
        match parse_numbered(index + 1, line) {
            Ok(record) => {
                found.records.push(record);
                found.kinds.push("record");
            }
            Err(problem) => {
                found.problems.push(problem);
                found.kinds.push("error");
            }
        }
    }
    found
}
${MAIN_DIVIDER}
// Lesson 15: reading the whole night log from stdin.
let mut file_text = String::new();
if let Err(problem) = io::stdin().read_to_string(&mut file_text) {
    println!("Could not read the log: {problem}");
}
let first_pass = import(&file_text);
println!(
    "Read {} lines: {} comments, {} blank, {} candidates",
    first_pass.kinds.len(),
    first_pass.count_of("comment"),
    first_pass.count_of("blank"),
    first_pass.count_of("record") + first_pass.count_of("error")
);
println!("{} records accepted, {} lines rejected", first_pass.records.len(), first_pass.problems.len());
for problem in &first_pass.problems {
    println!("  {problem}");
}

let file_lines: Vec<Json> = file_text
    .lines()
    .zip(&first_pass.kinds)
    .enumerate()
    .map(|(index, (text, kind))| Json::new().with("n", index + 1).with("kind", *kind).with("text", text))
    .collect();
scene("fileLines", &file_lines);
scene(
    "intake",
    Json::new()
        .with("read", first_pass.kinds.len())
        .with("comments", first_pass.count_of("comment"))
        .with("blanks", first_pass.count_of("blank"))
        .with("accepted", first_pass.records.len())
        .with("rejected", first_pass.problems.len()),
);
scene("problems", first_pass.problems.iter().map(|problem| problem.to_string()).collect::<Vec<String>>());`,
      explanation:
        "Reading the whole input into one String that lives for the rest of main lets every Record borrow from it. import() trims each line (a view, no copy), classifies blanks and comments, and for the rest keeps parse_numbered's Ok records and Err problems in separate vectors, so one bad line never hides the others. The line number comes from enumerate over every line, so it matches the file as an editor would show it.",
      hints: [
        { id: "h1", title: "The loop in import", content: "let mut found = Import { records: Vec::new(), problems: Vec::new(), kinds: Vec::new() }; for (index, raw) in text.lines().enumerate() { let line = raw.trim(); if line.is_empty() { found.kinds.push(\"blank\"); continue; } if line.starts_with('#') { found.kinds.push(\"comment\"); continue; } match parse_numbered(index + 1, line) { ... } } found" },
        { id: "h2", title: "Reading stdin", content: "use std::io::{self, Read}; and in main: let mut file_text = String::new(); if let Err(problem) = io::stdin().read_to_string(&mut file_text) { println!(\"Could not read the log: {problem}\"); } let first_pass = import(&file_text); Declare file_text before first_pass so it outlives it." },
        { id: "h3", title: "Counting and scene", content: "count_of: self.kinds.iter().filter(|label| **label == kind).count(). Candidates are first_pass.count_of(\"record\") + first_pass.count_of(\"error\"). For fileLines: file_text.lines().zip(&first_pass.kinds).enumerate().map(|(index, (text, kind))| Json::new().with(\"n\", index + 1).with(\"kind\", *kind).with(\"text\", text)).collect::<Vec<Json>>()" },
      ],
      tests: [
        {
          id: "t1",
          description: "The whole file is read and summarised",
          assertionCode: js`
assert(lines.includes("Read 26 lines: 3 comments, 2 blank, 21 candidates"), 'No line is exactly "Read 26 lines: 3 comments, 2 blank, 21 candidates". Read all of stdin into one String with read_to_string (needs use std::io::Read), classify each line, and count with count_of.');
assert(lines.includes("16 records accepted, 5 lines rejected"), 'No line is exactly "16 records accepted, 5 lines rejected". Blank lines and # comments are skipped (and not errors); every other line becomes a record or a problem.');`,
        },
        {
          id: "t2",
          description: "Every problem is reported with its line number",
          assertionCode: js`
const want = [
  "  line 15: expected 6 fields, found 5",
  "  line 19: not a whole number (invalid digit found in string)",
  "  line 21: the star has no name",
  "  line 22: declination 99.26 is out of range",
  "  line 24: not a decimal number (invalid float literal)",
];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + JSON.stringify(missing) + ". Number every line of the file (enumerate over ALL lines, comments and blanks included, plus 1) and print each LineError with two leading spaces.");`,
        },
        {
          id: "t3",
          description: "The observatory receives the file strip, the counts and the problems",
          assertionCode: js`
const f = scene.fileLines;
assert(Array.isArray(f) && f.length === 26, 'Send scene("fileLines", &file_lines); with one entry per input line (26).');
assertEqual(f[0].n, 1, "n starts at 1");
assertEqual(f[0].kind, "comment", "The first line is a comment");
assertEqual(f.filter((x) => x.kind === "error").map((x) => x.n).join(","), "15,19,21,22,24", "kind error should mark lines 15, 19, 21, 22 and 24");
const i = scene.intake;
assert(i && i.read === 26 && i.comments === 3 && i.blanks === 2 && i.accepted === 16 && i.rejected === 5, 'Send scene("intake", Json::new()...) with read 26, comments 3, blanks 2, accepted 16 and rejected 5.');
assert(Array.isArray(scene.problems) && scene.problems.length === 5 && scene.problems[0] === "line 15: expected 6 fields, found 5", 'Send scene("problems", ...) with the five problem texts (no leading spaces).');`,
        },
      ],
      unlocks: ["ob-intake"],
      checks: [
        {
          prompt: "Why does the importer read stdin into ONE String before parsing, instead of handling each line as it arrives?",
          question: {
            type: "choice",
            options: ["It is faster to type", "Records borrow from the text, so the text must stay alive as long as the records do", "`lines()` does not work on stdin", "Rust forbids reading line by line"],
            answer: 1,
          },
          explanation: "A `Record<'a>` holds views into the buffer. Per-line temporary Strings would be dropped while records still pointed at them (E0597). One long-lived owner keeps every view valid.",
        },
        {
          prompt: "A file has a comment on line 1, a blank on line 2 and a broken record on line 3. What line number should the error report?",
          question: { type: "number", answer: 3 },
          explanation: "Line numbers match the file as a person sees it, so comments and blanks count. That is why the number comes from `enumerate()` over every line, plus 1.",
        },
        {
          prompt: "You want every good record AND every error from a file. Which approach fits?",
          question: {
            type: "choice",
            options: ["`collect::<Result<Vec<_>, _>>()`", "A loop with a `match` that pushes into two vectors", "`unwrap()` on every line", "`filter_map` with `ok()`"],
            answer: 1,
          },
          explanation: "Collecting into a `Result` stops at the first error, and `filter_map(.. .ok())` throws the errors away. Matching in a loop keeps both piles.",
        },
      ],
    },
    // ───────────────────────── 16 ─────────────────────────
    {
      id: "rust-inventory-16-capstone",
      title: "Capstone: the Corvid Peak importer",
      minutes: 60,
      xp: 260,
      concepts: ["HashSet", "dedupe", "lifetimes in a signature", "iterator aggregation", "Display report", "self-test gate", "putting it together"],
      learn: md`### Everything at once

Look at what you have built. Every lesson added one piece, and this one connects them into the program you would hand to the observatory:

~~~text
read (15)  ->  parse with lifetimes (1-3, 7)  ->  validate (5, 6, 16)  ->  aggregate with iterators (9, 10)  ->  Display report (12)  ->  run the tests (14)
 stdin          Record<'a> borrows the buffer      CatalogError, ?, From      BTreeMap, min_by_key, fold            aligned columns         checks gate the output
~~~

The only genuinely new piece is **validation across records**: a single line can be fine and still be wrong because it repeats an earlier one. The night log has Vega twice.

### Duplicates with a HashSet

A \`HashSet<T>\` stores each value once and answers "is it already there?" in constant time. Its \`insert\` method does the lookup and the add in one call and returns **whether the value was new**:

~~~rust
use std::collections::HashSet;

let mut seen = HashSet::new();
seen.insert("Vega");     // true: first time
seen.insert("Vega");     // false: already there
~~~

That boolean is the whole trick for deduplication. The set holds \`&str\` views of names: no copies.

~~~rust
fn split_duplicates<'a>(list: &'a [Record<'a>]) -> (Vec<&'a Record<'a>>, Vec<CatalogError>) {
    let mut seen = HashSet::new();
    let mut unique = Vec::new();
    let mut repeats = Vec::new();
    for record in list {
        if seen.insert(record.name) {
            unique.push(record);
        } else {
            repeats.push(CatalogError::Duplicate { name: record.name.to_string() });
        }
    }
    (unique, repeats)
}
~~~

Two things to read carefully. The returned tuple holds *references into \`list\`* (so they share \`'a\`) and *owned errors* (no lifetime). And this is the \`Duplicate\` variant lesson 5 declared early, now finally constructed. (You could write the same dedupe as one \`filter\` with a closure that calls \`seen.insert(..)\` inside: a closure that changes captured state is an \`FnMut\`, the kind from lesson 8, and \`filter\` accepts it. The explicit loop is better here because you also want the repeats.)

Why a single \`'a\` for both the slice borrow and the \`Record<'a>\`? A shared reference lets Rust shorten the lifetime inside it (a \`Record\` that is valid for a long time can be used where a short one is needed), so one name is enough and the compiler picks the shorter of the two at the call.

### The aggregates

Over the unique records, with tools from lessons 9 and 10:

~~~rust
let mut final_constellations: BTreeMap<&str, usize> = BTreeMap::new();
for record in &unique {
    *final_constellations.entry(record.constellation).or_insert(0) += 1;
}
let final_nearest = unique.iter().min_by_key(|record| record.distance_ly).map(|record| record.name).unwrap_or("nobody");
let final_mean = unique.iter().map(|record| record.distance_ly as f64).sum::<f64>() / unique.len().max(1) as f64;
~~~

- \`*map.entry(key).or_insert(0) += 1\` is the Reef Station counter: \`or_insert\` hands back a mutable reference and the star writes through it.
- \`as f64\` converts each distance (a cast, lesson 3 of Reef Station) so the mean has decimals.
- \`unique.len().max(1)\` guards against dividing by zero on an empty import: with no stars you would otherwise compute \`0.0 / 0.0\`, which is NaN. A mean of an empty list is a decision; make it consciously.

### The report as a type

Put the facts in a struct that borrows names from the buffer, and give it a \`Display\`. It has a lifetime because it holds \`&str\`:

~~~rust
struct NightReport<'a> {
    night: u32,
    read: usize,
    accepted: usize,
    rejected: usize,
    nearest: &'a str,
    faintest: &'a str,
    mean_ly: f64,
    constellations: BTreeMap<&'a str, usize>,
}

impl fmt::Display for NightReport<'_> { /* writeln! lines with {:<16}{:>18}, a "*".repeat(count) histogram */ }
~~~

\`"*".repeat(n)\` builds a string of n stars: a histogram without a charting library.

### The self-test gate

The program ends by running the lesson 14 checks again and refusing to call the result trustworthy if any fail:

~~~rust
let self_test = run_checks(&checks);
let self_test_passed = self_test.iter().filter(|(_, outcome)| outcome.is_ok()).count();
~~~

\`outcome.is_ok()\` turns each \`Result\` into a bool. Because \`checks\` was built in lesson 14 and is still in scope, the capstone reuses it: that is the payoff of building the course as one growing program.

### What you can now do

Look back at the first lesson's picture of a buffer and slices. The finished importer never copies a field it does not need to; every name in the report is still a view into the original text, and the compiler has verified, at every step, that none of them outlives it. Along the way you wrote a real error type and made \`?\` do the plumbing, split code into modules, stored closures, read pipelines of adaptors, wrote your own iterator, formatted reports, derived and sorted, and tested. The next project of this path, the Advanced one, takes the ideas you only brushed past here (traits, generics and trait objects) and builds a whole system on them.

### Common mistakes

- Reporting counts that disagree with each other. Derive one number from another where you can (the rejected count is the problems plus the duplicates).
- Dividing by \`len()\` without thinking about zero.
- Printing the report before checking the self-test.
- Putting a lifetime on a struct and then dropping the buffer before the report is printed.`,
      mission: md`Corvid Peak publishes its catalogue tonight. Assemble the final importer: take the first pass over the file, drop the repeated star, compute the figures with iterators, print the report card, and run the self-test so nobody trusts a broken parser.

When this lesson passes, the **Night report** lights up and every panel of the observatory is live. The sky chart shows the whole import, with each star's name a borrowed view into the file you read.`,
      tasks: [
        "Above the divider add use std::collections::HashSet; and fn split_duplicates<'a>(list: &'a [Record<'a>]) -> (Vec<&'a Record<'a>>, Vec<CatalogError>) using a HashSet of names: insert returns true for a first sighting (unique) and false for a repeat (push CatalogError::Duplicate { name })",
        "Define struct NightReport<'a> { night: u32, read: usize, accepted: usize, rejected: usize, nearest: &'a str, faintest: &'a str, mean_ly: f64, constellations: BTreeMap<&'a str, usize> } and implement Display: a title \" Corvid Peak, night N \" centred with = in width 34, lines read / stars accepted / lines rejected / nearest / faintest as {:<16}{:>18}, mean distance as {:<16}{:>15.1} ly, one line per constellation as {:<16} followed by a * per star, and a closing line of 34 = signs (no trailing newline)",
        "In main run the self-test: let self_test = run_checks(&checks); count the passes into self_test_passed and print Self-test: 6/6 checks passed",
        "Call split_duplicates(&first_pass.records), print each repeat as Dropped: Vega is already in the catalogue, and build final_constellations (count per constellation), final_nearest, final_faintest (max_by with total_cmp) and final_mean (sum as f64 divided by the count, guarding zero with len().max(1))",
        "Create night_report (night 42; read = first_pass.kinds.len(); accepted = unique.len(); rejected = first_pass.problems.len() + repeats.len()) and print it with {night_report}",
        "Print Importer finished: 15 stars, 6 problems, all checks green when every check passed (otherwise a warning line that the report should not be trusted)",
        "Send fileText (&file_text), records (unique records via scene_card(&file_text)), problems (every problem text, repeats last), report (night, read, accepted, rejected, nearest, faintest, meanLy and constellations as the map), and the tests and testSummary from the self-test",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: the importer, end to end. Write these in this part of the file (above main):
// use std::collections::HashSet;
// fn split_duplicates<'a>(list: &'a [Record<'a>]) -> (Vec<&'a Record<'a>>, Vec<CatalogError>)          HashSet::insert(record.name): true = unique, false = CatalogError::Duplicate { name }
// struct NightReport<'a> { night: u32, read: usize, accepted: usize, rejected: usize, nearest: &'a str, faintest: &'a str, mean_ly: f64, constellations: BTreeMap<&'a str, usize> }
// impl fmt::Display for NightReport<'_>        writeln!(f, "{:=^34}", format!(" Corvid Peak, night {} ", self.night))?;  then {:<16}{:>18} lines (lines read, stars accepted, lines rejected, nearest, faintest),
//                                              {:<16}{:>15.1} ly for mean distance, {:<16}{} with "*".repeat(count) per constellation, and a last write!(f, "{:=^34}", "")
${MAIN_DIVIDER}
// let self_test = run_checks(&checks);   self_test_passed = number of Ok outcomes     print:  Self-test: 6/6 checks passed
// let (unique, repeats) = split_duplicates(&first_pass.records);    for each repeat print:  Dropped: Vega is already in the catalogue
// final_constellations: BTreeMap<&str, usize> (*entry(..).or_insert(0) += 1), final_nearest, final_faintest, final_mean = sum of distance_ly as f64 / unique.len().max(1) as f64
// let night_report = NightReport { night: 42, read: first_pass.kinds.len(), accepted: unique.len(), rejected: first_pass.problems.len() + repeats.len(), .. };      println!("{night_report}");
// print:  Importer finished: 15 stars, 6 problems, all checks green
// scene keys: fileText records (unique cards, scene_card(&file_text)) problems (all texts, repeats last) report (Json: night read accepted rejected nearest faintest meanLy constellations) tests testSummary
`,
      solutionAdd: rs`use std::collections::HashSet;

fn split_duplicates<'a>(list: &'a [Record<'a>]) -> (Vec<&'a Record<'a>>, Vec<CatalogError>) {
    let mut seen = HashSet::new();
    let mut unique = Vec::new();
    let mut repeats = Vec::new();
    for record in list {
        if seen.insert(record.name) {
            unique.push(record);
        } else {
            repeats.push(CatalogError::Duplicate { name: record.name.to_string() });
        }
    }
    (unique, repeats)
}

struct NightReport<'a> {
    night: u32,
    read: usize,
    accepted: usize,
    rejected: usize,
    nearest: &'a str,
    faintest: &'a str,
    mean_ly: f64,
    constellations: BTreeMap<&'a str, usize>,
}

impl fmt::Display for NightReport<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "{:=^34}", format!(" Corvid Peak, night {} ", self.night))?;
        writeln!(f, "{:<16}{:>18}", "lines read", self.read)?;
        writeln!(f, "{:<16}{:>18}", "stars accepted", self.accepted)?;
        writeln!(f, "{:<16}{:>18}", "lines rejected", self.rejected)?;
        writeln!(f, "{:<16}{:>18}", "nearest", self.nearest)?;
        writeln!(f, "{:<16}{:>18}", "faintest", self.faintest)?;
        writeln!(f, "{:<16}{:>15.1} ly", "mean distance", self.mean_ly)?;
        for (name, count) in &self.constellations {
            writeln!(f, "{:<16}{}", name, "*".repeat(*count))?;
        }
        write!(f, "{:=^34}", "")
    }
}
${MAIN_DIVIDER}
// Lesson 16: the importer, end to end.
let self_test = run_checks(&checks);
let self_test_passed = self_test.iter().filter(|(_, outcome)| outcome.is_ok()).count();
println!("Self-test: {self_test_passed}/{} checks passed", self_test.len());

let (unique, repeats) = split_duplicates(&first_pass.records);
for repeat in &repeats {
    println!("Dropped: {repeat}");
}

let mut final_constellations: BTreeMap<&str, usize> = BTreeMap::new();
for record in &unique {
    *final_constellations.entry(record.constellation).or_insert(0) += 1;
}
let final_nearest = unique.iter().min_by_key(|record| record.distance_ly).map(|record| record.name).unwrap_or("nobody");
let final_faintest = unique.iter().max_by(|a, b| a.magnitude.total_cmp(&b.magnitude)).map(|record| record.name).unwrap_or("nobody");
let final_mean = unique.iter().map(|record| record.distance_ly as f64).sum::<f64>() / unique.len().max(1) as f64;

let night_report = NightReport {
    night: 42,
    read: first_pass.kinds.len(),
    accepted: unique.len(),
    rejected: first_pass.problems.len() + repeats.len(),
    nearest: final_nearest,
    faintest: final_faintest,
    mean_ly: final_mean,
    constellations: final_constellations,
};
println!("{night_report}");
if self_test_passed == self_test.len() {
    println!("Importer finished: {} stars, {} problems, all checks green", night_report.accepted, night_report.rejected);
} else {
    println!("Importer finished, but {} checks failed: do not trust this report", self_test.len() - self_test_passed);
}

let mut every_problem: Vec<String> = first_pass.problems.iter().map(|problem| problem.to_string()).collect();
every_problem.extend(repeats.iter().map(|repeat| repeat.to_string()));
scene("fileText", &file_text);
scene("records", unique.iter().map(|record| record.scene_card(&file_text)).collect::<Vec<Json>>());
scene("problems", &every_problem);
scene(
    "report",
    Json::new()
        .with("night", night_report.night)
        .with("read", night_report.read)
        .with("accepted", night_report.accepted)
        .with("rejected", night_report.rejected)
        .with("nearest", night_report.nearest)
        .with("faintest", night_report.faintest)
        .with("meanLy", night_report.mean_ly)
        .with("constellations", &night_report.constellations),
);
scene("tests", self_test.iter().map(|(name, outcome)| Json::new().with("name", *name).with("ok", outcome.is_ok()).with("message", outcome.clone().err().unwrap_or_default())).collect::<Vec<Json>>());
scene("testSummary", Json::new().with("passed", self_test_passed).with("failed", self_test.len() - self_test_passed));`,
      explanation:
        "HashSet::insert returns false for a name it already holds, so the loop in split_duplicates keeps the first Vega and turns the second into a Duplicate error. The aggregates reuse the iterator tools from lessons 9 and 10 over the unique records, the report is a struct that borrows names from the file text and prints itself through Display, and the self-test reuses the checks built in lesson 14, so the program only declares success when its own parser passes.",
      hints: [
        { id: "h1", title: "Finding the repeat", content: "let mut seen = HashSet::new(); for record in list { if seen.insert(record.name) { unique.push(record); } else { repeats.push(CatalogError::Duplicate { name: record.name.to_string() }); } } (unique, repeats) The tuple holds references into list and owned errors." },
        { id: "h2", title: "The report numbers", content: "final_constellations: for record in &unique { *final_constellations.entry(record.constellation).or_insert(0) += 1; } final_mean: unique.iter().map(|record| record.distance_ly as f64).sum::<f64>() / unique.len().max(1) as f64. The faintest star uses max_by(|a, b| a.magnitude.total_cmp(&b.magnitude))." },
        { id: "h3", title: "Display and scene", content: "writeln!(f, \"{:=^34}\", format!(\" Corvid Peak, night {} \", self.night))?; then writeln!(f, \"{:<16}{:>18}\", \"lines read\", self.read)? and so on; for the histogram: writeln!(f, \"{:<16}{}\", name, \"*\".repeat(*count))? and finish with write!(f, \"{:=^34}\", \"\"). Scene: scene(\"records\", unique.iter().map(|record| record.scene_card(&file_text)).collect::<Vec<Json>>());" },
      ],
      tests: [
        {
          id: "t1",
          description: "The self-test runs first and the duplicate is dropped",
          assertionCode: js`
assert(lines.includes("Self-test: 6/6 checks passed"), 'No line is exactly "Self-test: 6/6 checks passed". Reuse the checks from lesson 14: let self_test = run_checks(&checks); and count the Ok outcomes.');
assert(lines.includes("Dropped: Vega is already in the catalogue"), 'No line is exactly "Dropped: Vega is already in the catalogue". Vega appears twice in the log; HashSet::insert returns false the second time, so push CatalogError::Duplicate { name } and print its Display.');`,
        },
        {
          id: "t2",
          description: "The report card lines are right",
          assertionCode: js`
const want = [
  "lines read                      26",
  "stars accepted                  15",
  "lines rejected                   6",
  "nearest                     Sirius",
  "faintest                   Alnitak",
  "mean distance             370.0 ly",
  "Orion           ****",
  "Lyra            *",
];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These report lines are missing: " + JSON.stringify(missing) + '. Rows use "{:<16}{:>18}", the mean uses "{:<16}{:>15.1} ly", constellations use "{:<16}" followed by a * per star. 15 stars are accepted (16 records minus the repeat), 6 lines rejected (5 parse problems plus the duplicate).');
assert(lines.includes("===== Corvid Peak, night 42 ======"), 'The title line should be {:=^34} of " Corvid Peak, night 42 ": ===== Corvid Peak, night 42 ======');`,
        },
        {
          id: "t3",
          description: "The importer announces it finished with its checks green",
          assertionCode: js`assert(lines.includes("Importer finished: 15 stars, 6 problems, all checks green"), 'No line is exactly "Importer finished: 15 stars, 6 problems, all checks green". Print it when self_test_passed equals the number of checks; use night_report.accepted and night_report.rejected.');`,
        },
        {
          id: "t4",
          description: "The observatory receives the finished import",
          assertionCode: js`
assert(typeof scene.fileText === "string" && scene.fileText.includes("Sirius|Canis Major"), 'Send the whole file text with scene("fileText", &file_text);');
const r = scene.records;
assert(Array.isArray(r) && r.length === 15, 'Send scene("records", ...); with the 15 unique records.');
assert(r.every((x) => typeof x.nameStart === "number"), "Every record card needs nameStart from offset_in(&file_text, record.name): the names must still be slices of the file text.");
assertEqual(r.filter((x) => x.name === "Vega").length, 1, "Vega should appear once");
const p = scene.problems;
assert(Array.isArray(p) && p.length === 6 && p[5] === "Vega is already in the catalogue", 'Send scene("problems", ...) with the five line problems followed by the duplicate text (6 in all).');
const rep = scene.report;
assert(rep && rep.night === 42 && rep.read === 26 && rep.accepted === 15 && rep.rejected === 6, 'Send scene("report", Json::new()...) with night 42, read 26, accepted 15, rejected 6.');
assert(rep.nearest === "Sirius" && rep.faintest === "Alnitak" && rep.meanLy === 370, "report should carry nearest Sirius, faintest Alnitak and meanLy 370");
assert(rep.constellations && rep.constellations.Orion === 4 && Object.keys(rep.constellations).length === 12, "report.constellations should map the 12 constellation names to counts (Orion 4). Send &night_report.constellations.");
assert(scene.testSummary && scene.testSummary.passed === 6 && Array.isArray(scene.tests) && scene.tests.length === 6, "Send the self-test results again: scene(\"tests\", ..) and scene(\"testSummary\", ..).");`,
        },
      ],
      unlocks: ["ob-report"],
      checks: [
        {
          prompt: "`HashSet::insert(value)` returns `false`. What does that tell you?",
          question: {
            type: "choice",
            options: ["The set is full", "The value was already in the set", "The value could not be hashed", "The value was removed"],
            answer: 1,
          },
          explanation: "`insert` returns `true` when the value is new and `false` when the set already contained it, which makes it a one-call duplicate detector.",
        },
        {
          prompt: "`NightReport<'a>` holds `nearest: &'a str`. What does that require of your `main`?",
          question: {
            type: "choice",
            options: ["Nothing", "That the text those names point into (`file_text`) stays alive as long as the report is used", "That the report is `static`", "That `nearest` is copied first"],
            answer: 1,
          },
          explanation: "The report borrows its names from the buffer, so the buffer must outlive it. `file_text` is declared at the top of `main` and dropped at the end, which covers the whole report.",
        },
        {
          prompt: "The importer prints \"Importer finished ... all checks green\". Why is it a good idea to gate that line on the self-test?",
          question: {
            type: "choice",
            options: ["It makes the program faster", "A report built by a broken parser should not be presented as trustworthy; the checks run the parser against known cases", "Rust requires it", "It hides errors"],
            answer: 1,
          },
          explanation: "The checks pin down the parser's behaviour on cases with known answers. If one fails, the numbers above it may be wrong, so the program says so instead of claiming success.",
        },
      ],
    },
  ],
};
