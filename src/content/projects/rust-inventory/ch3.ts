import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 3: Iterator pipelines. Adaptors that shape a stream, adaptors that gather it, your own iterator
 * and Display for the report types. Each lesson's text may hold MAIN_DIVIDER (engine/compose.ts):
 * what is above it goes before `fn main()`, what is below it joins main's body.
 */

export const chapter3: Chapter = {
  id: "iterator-pipelines",
  title: "Iterator pipelines",
  blurb: "Describe what should happen to a stream of lines and let the compiler turn it into a tight loop.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "rust-inventory-9-adaptors-shape",
      title: "Iterator adaptors 1: shape the stream",
      minutes: 45,
      xp: 170,
      concepts: ["Iterator", "lazy adaptors", "map", "filter", "filter_map", "enumerate", "skip / take", "chain", "rev", "&&str in filter"],
      learn: md`### A pipeline you can read

In Reef Station you counted and summed with \`iter().filter(..).count()\`. This lesson and the next make that a skill. An **iterator** is anything with a \`next()\` method that hands out one item at a time and then says "no more" (\`None\`). A pipeline has three parts:

~~~text
source          adaptors (each returns a new iterator)           consumer (produces the result)
buffer.lines()  .filter(..)  .filter_map(..)  .take(3)           .count()   .collect()   .sum()   for loop
~~~

- The **source** creates the stream: \`lines()\`, \`split(..)\`, \`iter()\`, a range \`0..10\`.
- **Adaptors** change the stream and return another iterator. They are **lazy**: building the chain does no work at all.
- The **consumer** pulls items through the chain, one at a time. Only then does anything run.

You can see laziness with a side effect. This prints nothing, because nothing consumes the chain:

~~~rust
let quiet = night_sheet.lines().map(|line| { println!("looking at {line}"); line.len() });
~~~

Add \`.count()\` and the prints appear, line by line. (In a project that shows warnings, rustc would flag the unused iterator: "iterators are lazy and do nothing unless consumed".) Each item flows through the **whole** chain before the next one starts; there is no giant intermediate list. After optimisation the chain compiles to roughly the loop you would have written by hand.

### The adaptors for shaping

- \`filter(|x| keep?)\`: keeps items where the closure returns true. The closure receives a **reference** to the item.
- \`map(|x| new)\`: transforms every item. One in, one out.
- \`filter_map(|x| Option)\`: transform and drop in one step: keeps the \`Some\` values, drops the \`None\`s. Perfect for "parse, skip failures".
- \`enumerate()\`: pairs each item with its 0-based index. \`(usize, item)\`.
- \`skip(n)\` / \`take(n)\`: drop the first n / stop after n. \`take\` also makes an endless stream finite.
- \`chain(other)\`: this stream, then another. Both must yield the same item type.
- \`rev()\`: backwards. Only for streams that can run from the back (slices, ranges, \`iter()\`).

### The \`&&str\` surprise

\`night_sheet.lines()\` yields \`&str\`. \`filter\` hands its closure a reference to each item, which is \`&&str\`. Method calls see through the extra \`&\` (so \`line.trim()\` just works), but when you name the parameter type in a function you must write it:

~~~rust
fn is_data_line(line: &&str) -> bool {
    let trimmed = line.trim();
    !trimmed.is_empty() && !trimmed.starts_with('#')
}

let data_total = night_sheet.lines().filter(is_data_line).count();    // a named fn works wherever a closure does
~~~

Passing a function by name (no \`()\`) is just as good as a closure when it has the right shape. That is how \`filter_map(Record::from_line)\` works too: \`from_line\` takes a \`&str\` and returns an \`Option<Record>\`, which is exactly what \`filter_map\` wants.

### Counting at each stage

To understand what a pipeline does, count after each step. Each count starts from the source again; nothing is stored in between:

~~~rust
let line_total   = night_sheet.lines().count();                                                        // 15
let data_total   = night_sheet.lines().filter(is_data_line).count();                                   // 12
let parsed_total = night_sheet.lines().filter(is_data_line).filter_map(Record::from_line).count();     // 11
~~~

Twelve data lines, eleven records: one line was smudged and \`from_line\` returned \`None\` for it, so \`filter_map\` quietly dropped it. (Lesson 10 shows how to keep the reason instead.) That "15, 12, 11, 7, 3" shape is what the observatory will draw.

### Numbering, windows and joins

~~~rust
for (position, record) in sheet_records.iter().enumerate().skip(1).take(3) {
    println!("{}. {}", position + 1, record.name);        // 2. Capella  3. Rigel  4. Procyon
}

let both_ends: Vec<&str> = sheet_records.iter().take(2)
    .chain(sheet_records.iter().rev().take(2))
    .map(|record| record.name)
    .collect();                                           // first two, then last two (backwards)
~~~

Order matters: \`enumerate().skip(1)\` numbers first and then skips, so the survivors keep their original numbers (1, 2, 3); \`skip(1).enumerate()\` would renumber them 0, 1, 2.

### \`iter()\`, \`into_iter()\` and the ownership trap

- \`list.iter()\` borrows: items are \`&T\`.
- \`list.into_iter()\` (what \`for x in list\` calls) **consumes** the Vec: items are \`T\` and the Vec is gone afterwards.
- \`list.iter_mut()\` borrows mutably: items are \`&mut T\`.

~~~text
error[E0382]: borrow of moved value: \`names\`
 --> main.rs:7:20
  |
4 |     for name in names {
  |                 ----- \`names\` moved due to this implicit call to \`.into_iter()\`
7 |     println!("{}", names.len());
  |                    ^^^^^ value borrowed here after move
help: consider iterating over a slice of the \`Vec<String>\`'s content to avoid moving into the \`for\` loop
  |
4 |     for name in &names {
~~~

### Collecting: say what you want

\`collect()\` can build many things, so it needs to know which. Annotate the variable (or use \`collect::<Vec<_>>()\`):

~~~text
error[E0282]: type annotations needed
 --> main.rs:4:9
  |
4 |     let upper = names.iter().map(|n| n.to_uppercase()).collect();
  |         ^^^^^
help: consider giving \`upper\` an explicit type
  |
4 |     let upper: Vec<_> = names.iter().map(|n| n.to_uppercase()).collect();
~~~

A second classic: \`iter()\` yields references, so collecting them into a \`Vec<i32>\` fails (E0277: a value of type \`Vec<i32>\` cannot be built from an iterator over elements of type \`&{integer}\`). Either collect into \`Vec<&i32>\`, or add \`.copied()\` (or \`.cloned()\`) before \`collect()\` to turn \`&T\` into \`T\`.

### Common mistakes

- Building a chain and never consuming it.
- Using a \`for\` loop with a body of 15 lines when it is the clearest tool. Pipelines are best when each step is one idea.
- Writing \`|line: &str|\` in a \`filter\` closure and being told it is \`&&str\`.
- Forgetting the type annotation on \`collect\` or \`sum\`.`,
      mission: md`Tonight's sheet is a typical mess: two comment lines, a blank, and a smudged record among the good ones. Before the importer can parse anything it has to decide which lines are even *data*. Build that as a pipeline and count how many lines survive each step, because the answers tell you whether the cleaning is doing its job.

The **Adaptor chain** panel draws your pipeline as a funnel with a count at every stage. Then use the stream for a shortlist, a numbered list and a first-and-last view.`,
      tasks: [
        "Above the divider write fn is_data_line(line: &&str) -> bool that is false for blank lines and for lines starting with '#' (trim first)",
        "In main create night_sheet from the 15 lines in the starter (use [..].join(\"\\n\")) and count the stages: line_total with lines().count(), data_total with filter(is_data_line), parsed_total adding filter_map(Record::from_line), bright_total adding filter(|record| record.magnitude < 1.0)",
        "Build shortlist: Vec<&str> with the same chain plus take(3) and map(|record| record.name), and print Pipeline: 15 lines -> 12 data -> 11 records -> 7 bright -> 3 shortlisted (use the variables) and Shortlist: Sirius, Capella, Rigel",
        "Collect sheet_records: Vec<Record> (data lines, filter_map). Print the records at positions 1, 2 and 3 with enumerate().skip(1).take(3) as 2. Capella, 3. Rigel and 4. Procyon (position + 1)",
        "Print First two and last two: Sirius, Capella, Regulus, Alnilam using take(2).chain(iter().rev().take(2)) and map to names",
        "Send chain (five Json with stage and count: lines(), filter: data lines, filter_map: parse, filter: magnitude < 1.0, take(3)) and shortlist",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: iterator adaptors. Write this in this part of the file (above main):
// fn is_data_line(line: &&str) -> bool        not blank, does not start with '#' (trim first)
${MAIN_DIVIDER}
// let night_sheet: String = [ "# northern sky, night 41", "Sirius|Canis Major|6.75|-16.72|-1.46|9", "Capella|Auriga|5.28|46.00|0.08|43", "Rigel|Orion|5.24|-8.20|0.13|860",
//     "", "Procyon|Canis Minor|7.65|5.22|0.34|11", "Betelgeuse|Orion|5.92|7.41|0.42|550", "Altair|Aquila|19.85|8.87|0.76|17",
//     "# the next line was smudged", "Antares|Scorpius|16.49|-26.43|1.06", "Aldebaran|Taurus|4.60|16.51|0.86|65", "Adhara|Canis Major|6.98|-28.97|1.50|430",
//     "Pollux|Gemini|7.76|28.03|1.14|34", "Alnilam|Orion|5.60|-1.20|1.69|2000", "Regulus|Leo|10.14|11.97|1.35|79" ].join("\n");
// line_total / data_total / parsed_total / bright_total: night_sheet.lines().count(), .filter(is_data_line), .filter_map(Record::from_line), .filter(|record| record.magnitude < 1.0)
// let shortlist: Vec<&str> = (same chain).take(3).map(|record| record.name).collect();
// print:  Pipeline: 15 lines -> 12 data -> 11 records -> 7 bright -> 3 shortlisted      Shortlist: Sirius, Capella, Rigel
// let sheet_records: Vec<Record> = night_sheet.lines().filter(is_data_line).filter_map(Record::from_line).collect();
// for (position, record) in sheet_records.iter().enumerate().skip(1).take(3) { print  2. Capella  /  3. Rigel  /  4. Procyon }
// print:  First two and last two: Sirius, Capella, Regulus, Alnilam            (take(2).chain(iter().rev().take(2)))
// scene("chain", vec![Json::new().with("stage", "lines()").with("count", line_total), ... five stages]);     scene("shortlist", &shortlist);
`,
      solutionAdd: rs`fn is_data_line(line: &&str) -> bool {
    let trimmed = line.trim();
    !trimmed.is_empty() && !trimmed.starts_with('#')
}
${MAIN_DIVIDER}
// Lesson 9: iterator adaptors.
let night_sheet: String = [
    "# northern sky, night 41",
    "Sirius|Canis Major|6.75|-16.72|-1.46|9",
    "Capella|Auriga|5.28|46.00|0.08|43",
    "Rigel|Orion|5.24|-8.20|0.13|860",
    "",
    "Procyon|Canis Minor|7.65|5.22|0.34|11",
    "Betelgeuse|Orion|5.92|7.41|0.42|550",
    "Altair|Aquila|19.85|8.87|0.76|17",
    "# the next line was smudged",
    "Antares|Scorpius|16.49|-26.43|1.06",
    "Aldebaran|Taurus|4.60|16.51|0.86|65",
    "Adhara|Canis Major|6.98|-28.97|1.50|430",
    "Pollux|Gemini|7.76|28.03|1.14|34",
    "Alnilam|Orion|5.60|-1.20|1.69|2000",
    "Regulus|Leo|10.14|11.97|1.35|79",
]
.join("\n");

let line_total = night_sheet.lines().count();
let data_total = night_sheet.lines().filter(is_data_line).count();
let parsed_total = night_sheet.lines().filter(is_data_line).filter_map(Record::from_line).count();
let bright_total = night_sheet.lines().filter(is_data_line).filter_map(Record::from_line).filter(|record| record.magnitude < 1.0).count();
let shortlist: Vec<&str> = night_sheet
    .lines()
    .filter(is_data_line)
    .filter_map(Record::from_line)
    .filter(|record| record.magnitude < 1.0)
    .take(3)
    .map(|record| record.name)
    .collect();
println!("Pipeline: {line_total} lines -> {data_total} data -> {parsed_total} records -> {bright_total} bright -> {} shortlisted", shortlist.len());
println!("Shortlist: {}", shortlist.join(", "));

let sheet_records: Vec<Record> = night_sheet.lines().filter(is_data_line).filter_map(Record::from_line).collect();
for (position, record) in sheet_records.iter().enumerate().skip(1).take(3) {
    println!("{}. {}", position + 1, record.name);
}
let both_ends: Vec<&str> = sheet_records.iter().take(2).chain(sheet_records.iter().rev().take(2)).map(|record| record.name).collect();
println!("First two and last two: {}", both_ends.join(", "));

scene(
    "chain",
    vec![
        Json::new().with("stage", "lines()").with("count", line_total),
        Json::new().with("stage", "filter: data lines").with("count", data_total),
        Json::new().with("stage", "filter_map: parse").with("count", parsed_total),
        Json::new().with("stage", "filter: magnitude < 1.0").with("count", bright_total),
        Json::new().with("stage", "take(3)").with("count", shortlist.len()),
    ],
);
scene("shortlist", &shortlist);`,
      explanation:
        "Each count restarts from night_sheet.lines(), and every stage removes some items: comments and the blank (15 to 12), the smudged line that from_line turns into None (12 to 11), the dim stars (11 to 7) and everything past the third (7 to 3). enumerate numbers the items before skip drops the first, so the survivors keep their original positions. chain joins the first two records to the last two, read backwards with rev().",
      hints: [
        { id: "h1", title: "The predicate", content: "fn is_data_line(line: &&str) -> bool { let trimmed = line.trim(); !trimmed.is_empty() && !trimmed.starts_with('#') } Then night_sheet.lines().filter(is_data_line).count()." },
        { id: "h2", title: "Growing the chain", content: "parsed_total: night_sheet.lines().filter(is_data_line).filter_map(Record::from_line).count(); bright_total adds .filter(|record| record.magnitude < 1.0) before count(); shortlist adds .take(3).map(|record| record.name).collect() instead." },
        { id: "h3", title: "Numbering and chaining", content: "for (position, record) in sheet_records.iter().enumerate().skip(1).take(3) { println!(\"{}. {}\", position + 1, record.name); } and sheet_records.iter().take(2).chain(sheet_records.iter().rev().take(2)).map(|record| record.name).collect::<Vec<&str>>()" },
      ],
      tests: [
        {
          id: "t1",
          description: "The pipeline narrows 15 lines to 3",
          assertionCode: js`
assert(lines.includes("Pipeline: 15 lines -> 12 data -> 11 records -> 7 bright -> 3 shortlisted"), 'No line is exactly "Pipeline: 15 lines -> 12 data -> 11 records -> 7 bright -> 3 shortlisted". Count after each stage, starting from night_sheet.lines() every time: is_data_line removes comments and blanks, filter_map(Record::from_line) removes the smudged line, filter keeps magnitude below 1.0, take(3) stops after three.');
assert(lines.includes("Shortlist: Sirius, Capella, Rigel"), 'No line is exactly "Shortlist: Sirius, Capella, Rigel". Collect the names of the first three bright records and join them with ", ".');`,
        },
        {
          id: "t2",
          description: "enumerate, skip, take and chain shape the list",
          assertionCode: js`
const want = ["2. Capella", "3. Rigel", "4. Procyon", "First two and last two: Sirius, Capella, Regulus, Alnilam"];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + ". Use enumerate().skip(1).take(3) and print position + 1, then take(2).chain(iter().rev().take(2)) for the ends.");`,
        },
        {
          id: "t3",
          description: "The observatory receives the chain counts",
          assertionCode: js`
const c = scene.chain;
assert(Array.isArray(c) && c.length === 5, 'Send scene("chain", vec![...]); with five stages.');
assertEqual(c.map((x) => x.count).join(","), "15,12,11,7,3", "The counts should be 15, 12, 11, 7 and 3");
assert(c.every((x) => typeof x.stage === "string" && x.stage.length > 0), "Each stage needs a name in stage");
assert(Array.isArray(scene.shortlist) && scene.shortlist.join(",") === "Sirius,Capella,Rigel", 'Send scene("shortlist", &shortlist); with the three names.');`,
        },
      ],
      unlocks: ["ob-chain"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~rust\nlet quiet = [1, 2, 3].iter().map(|n| { println!(\"saw {n}\"); n * 2 });\n~~~",
          question: {
            type: "choice",
            options: ["saw 1, saw 2, saw 3", "Nothing: adaptors are lazy until something consumes the iterator", "A compile error", "saw 3"],
            answer: 1,
          },
          explanation: "`map` only describes work. No consumer (`collect`, `count`, `sum`, a `for` loop) pulls items through the chain, so the closure never runs.",
        },
        {
          prompt: "`filter_map(Record::from_line)` where `from_line` returns `Option<Record>`. What happens to a line for which it returns `None`?",
          question: {
            type: "choice",
            options: ["The pipeline stops", "The line is dropped and the stream continues with the next one", "A default record is inserted", "The program panics"],
            answer: 1,
          },
          explanation: "`filter_map` keeps the payload of each `Some` and silently skips each `None`. That is convenient and also a trap: the reason for the failure is gone, which is why lesson 10 collects `Result`s.",
        },
      ],
    },
    // ───────────────────────── 10 ─────────────────────────
    {
      id: "rust-inventory-10-adaptors-gather",
      title: "Iterator adaptors 2: gather the results",
      minutes: 50,
      xp: 180,
      concepts: ["sum", "fold", "min_by_key", "max_by", "total_cmp", "BTreeMap", "entry().or_default()", "partition", "collect into Result", "E0283", "E0277"],
      learn: md`### From a stream to an answer

Lesson 9 shaped streams. These are the consumers and collectors that turn a stream into one value or a new collection. You will use almost all of them in the capstone.

### sum, fold, min and max

~~~rust
let total_ly: u32 = sheet_records.iter().map(|record| record.distance_ly).sum();
~~~

\`sum\` adds the items, but it must know the result type. Leave the annotation out and you get a request for it, because many types can be summed:

~~~text
error[E0283]: type annotations needed
 --> main.rs:4:9
  |
4 |     let total = d.iter().sum();
  |         ^^^^^            --- type must be known at this point
  = note: the type must implement \`Sum<&u32>\`
help: consider giving \`total\` an explicit type
~~~

Write \`let total: u32 = ...\` or \`.sum::<u32>()\`.

**\`fold(start, |acc, item| new_acc)\`** is the general version of every loop that carries something along. It threads an accumulator through the stream and returns it at the end. One pass can compute two things at once:

~~~rust
let (nearest_ly, farthest_ly) = sheet_records
    .iter()
    .fold((u32::MAX, 0), |(low, high), record| (low.min(record.distance_ly), high.max(record.distance_ly)));
~~~

The start value is a pair, the closure takes the pair apart in its parameter list, and returns the updated pair. \`u32::MAX\` is the biggest \`u32\`, so any real distance beats it.

To find the **star** rather than the number, ask for the item that is smallest or largest *by some key*:

~~~rust
let nearest = sheet_records.iter().min_by_key(|record| record.distance_ly).map(|record| record.name).unwrap_or("nobody");
~~~

Both \`min_by_key\` and \`max_by_key\` return an \`Option\` (an empty stream has no minimum), and I used \`.map\` on the Option to get the name and \`unwrap_or\` for the empty case. If two items tie, \`min_by_key\` returns the **first** and \`max_by_key\` the **last**.

### Floats do not have a total order

Magnitudes are \`f64\`. Try the obvious thing:

~~~text
error[E0277]: the trait bound \`f64: Ord\` is not satisfied
 --> main.rs:5:22
  |
5 |     let f = v.iter().max_by_key(|s| s.mag);
  |                      ^^^^^^^^^^ the trait \`Ord\` is not implemented for \`f64\`
~~~

Why? \`NaN\` ("not a number") is neither smaller nor larger than anything, including itself, so floats cannot promise a total order. The same wall stops \`sort()\` and \`max()\` on floats. The fix is to say how to compare them yourself with **\`max_by\`** (or \`min_by\`), which takes a closure returning an \`Ordering\`, and \`f64::total_cmp\`, which orders every float including NaN:

~~~rust
let faintest = sheet_records.iter().max_by(|a, b| a.magnitude.total_cmp(&b.magnitude)).map(|record| record.name).unwrap_or("nobody");
~~~

(Older code writes \`a.partial_cmp(b).unwrap()\`, which panics if a NaN ever shows up; \`total_cmp\` cannot.) Remember astronomers' convention: the *largest* magnitude number is the *faintest* star.

### Grouping into a map

~~~rust
use std::collections::BTreeMap;

let mut by_constellation: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
for record in &sheet_records {
    by_constellation.entry(record.constellation).or_default().push(record.name);
}
~~~

\`entry(key).or_default()\` finds the slot for the key and, if it is new, puts the type's default there (an empty \`Vec\` here), then gives you a mutable reference to push into. It is the grouping cousin of Reef Station's \`or_insert(0)\` counter. A **\`BTreeMap\`** keeps its keys in sorted order, so iterating it prints constellations alphabetically every time; a \`HashMap\` would give an unpredictable order. When output has to be stable, or shown to people, reach for \`BTreeMap\`.

You can also build a map straight from a stream of pairs with \`collect\`:

~~~rust
let counts: BTreeMap<&str, usize> = by_constellation.iter().map(|(name, stars)| (*name, stars.len())).collect();
~~~

### partition: two piles

~~~rust
let (bright_stars, dim_stars): (Vec<&Record>, Vec<&Record>) =
    sheet_records.iter().partition(|record| record.magnitude < 1.0);
~~~

\`partition\` walks the stream once and sends each item to the first collection when the closure says true, the second otherwise. The type annotation tells it what to build.

### collect into a Result: all or nothing

Lesson 9's \`filter_map\` threw failures away. When you want to know about them, map each line to a \`Result\` and collect:

~~~rust
let batch: Result<Vec<Record>, CatalogError> = lines.iter().map(|line| Record::parse(line)).collect();
~~~

\`collect\` can turn an iterator of \`Result<T, E>\` into a single \`Result<Vec<T>, E>\`: either **all** the items were \`Ok\` and you get the whole \`Vec\`, or it stops at the **first** \`Err\` and returns that. (\`Option\` works the same way.) So the smudged batch below reports the first problem and builds nothing:

~~~text
Tidy batch: all 3 lines parsed
Smudged batch: stopped: expected 6 fields, found 5
~~~

Choose on purpose: \`filter_map\` when "skip what you cannot read" is acceptable, \`collect::<Result<_, _>>()\` when one bad item should fail the whole batch, and a plain loop that pushes into two vectors (lesson 15) when you want *both* the good records and every error.

### Common mistakes

- \`sum()\` or \`collect()\` without a type.
- Using \`max_by_key\` with a float key.
- Expecting a \`HashMap\` to iterate in insertion order.
- Forgetting that \`min_by_key\` / \`max_by\` return an \`Option\`.
- Reading "largest magnitude" as "brightest".`,
      mission: md`Now the importer must say something about the sheet as a whole: how far away all its stars are, which is nearest and which is faintest, which constellations they belong to, how many are bright, and whether a batch of lines is safe to trust as a unit.

The **Aggregates** panel shows tiles, constellation groups, a bright/dim split and the all-or-nothing verdict from your numbers.`,
      tasks: [
        "Above the divider add use std::collections::BTreeMap;",
        "In main (reusing sheet_records from the last lesson) compute total_ly: u32 with map + sum, (nearest_ly, farthest_ly) with one fold, nearest with min_by_key (distance_ly) and faintest with max_by and total_cmp (magnitude); both as names with unwrap_or(\"nobody\")",
        "Print Total distance 4098 ly, nearest 9 ly, farthest 2000 ly and Nearest star: Sirius; faintest star: Alnilam from the variables",
        "Group names by constellation in by_constellation: BTreeMap<&str, Vec<&str>> with entry(..).or_default().push(..) and print one line per constellation: Orion: Rigel, Betelgeuse, Alnilam",
        "Use partition on the records (magnitude < 1.0) into bright_stars and dim_stars and print 7 bright, 4 dim",
        "Collect tidy_batch and smudged_batch as Result<Vec<Record>, CatalogError> from the two line lists in the starter using Record::parse. Print Tidy batch: all 3 lines parsed and Smudged batch: stopped: expected 6 fields, found 5",
        "Send totalLy, nearest, faintest, byConstellation (&by_constellation), brightNames, dimNames (Vec<&str> of names) and allOrNothing (a Json with tidy and smudged texts)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: adaptors that gather. Add this in this part of the file (above main):
// use std::collections::BTreeMap;
${MAIN_DIVIDER}
// total_ly: u32 = sheet_records.iter().map(|record| record.distance_ly).sum();
// (nearest_ly, farthest_ly) = sheet_records.iter().fold((u32::MAX, 0), |(low, high), record| (low.min(..), high.max(..)));
// nearest = ...min_by_key(|record| record.distance_ly).map(|record| record.name).unwrap_or("nobody");
// faintest = ...max_by(|a, b| a.magnitude.total_cmp(&b.magnitude))...
// print:  Total distance 4098 ly, nearest 9 ly, farthest 2000 ly       Nearest star: Sirius; faintest star: Alnilam
// let mut by_constellation: BTreeMap<&str, Vec<&str>> = BTreeMap::new();     entry(record.constellation).or_default().push(record.name)
// for (constellation_name, stars) in &by_constellation { print  Orion: Rigel, Betelgeuse, Alnilam }
// let (bright_stars, dim_stars): (Vec<&Record>, Vec<&Record>) = sheet_records.iter().partition(|record| record.magnitude < 1.0);     print:  7 bright, 4 dim
// let tidy_lines = ["Vega|Lyra|18.62|38.78|0.03|25", "Rigel|Orion|5.24|-8.20|0.13|860", "Altair|Aquila|19.85|8.87|0.76|17"];
// let smudged_lines = ["Vega|Lyra|18.62|38.78|0.03|25", "Antares|Scorpius|16.49|-26.43|1.06", "Altair|Aquila|19.85|8.87|0.76|17"];
// let tidy_batch: Result<Vec<Record>, CatalogError> = tidy_lines.iter().map(|line| Record::parse(line)).collect();      (same for smudged_batch)
// print:  Tidy batch: all 3 lines parsed       Smudged batch: stopped: expected 6 fields, found 5
// scene keys: totalLy nearest faintest byConstellation brightNames dimNames allOrNothing (Json: tidy, smudged)
`,
      solutionAdd: rs`use std::collections::BTreeMap;
${MAIN_DIVIDER}
// Lesson 10: adaptors that gather.
let total_ly: u32 = sheet_records.iter().map(|record| record.distance_ly).sum();
let (nearest_ly, farthest_ly) = sheet_records
    .iter()
    .fold((u32::MAX, 0), |(low, high), record| (low.min(record.distance_ly), high.max(record.distance_ly)));
let nearest = sheet_records.iter().min_by_key(|record| record.distance_ly).map(|record| record.name).unwrap_or("nobody");
let faintest = sheet_records.iter().max_by(|a, b| a.magnitude.total_cmp(&b.magnitude)).map(|record| record.name).unwrap_or("nobody");
println!("Total distance {total_ly} ly, nearest {nearest_ly} ly, farthest {farthest_ly} ly");
println!("Nearest star: {nearest}; faintest star: {faintest}");

let mut by_constellation: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
for record in &sheet_records {
    by_constellation.entry(record.constellation).or_default().push(record.name);
}
for (constellation_name, stars) in &by_constellation {
    println!("{constellation_name}: {}", stars.join(", "));
}

let (bright_stars, dim_stars): (Vec<&Record>, Vec<&Record>) = sheet_records.iter().partition(|record| record.magnitude < 1.0);
println!("{} bright, {} dim", bright_stars.len(), dim_stars.len());

let tidy_lines = ["Vega|Lyra|18.62|38.78|0.03|25", "Rigel|Orion|5.24|-8.20|0.13|860", "Altair|Aquila|19.85|8.87|0.76|17"];
let smudged_lines = ["Vega|Lyra|18.62|38.78|0.03|25", "Antares|Scorpius|16.49|-26.43|1.06", "Altair|Aquila|19.85|8.87|0.76|17"];
let tidy_batch: Result<Vec<Record>, CatalogError> = tidy_lines.iter().map(|line| Record::parse(line)).collect();
let smudged_batch: Result<Vec<Record>, CatalogError> = smudged_lines.iter().map(|line| Record::parse(line)).collect();
let tidy_text = match &tidy_batch {
    Ok(batch) => format!("all {} lines parsed", batch.len()),
    Err(error) => format!("stopped: {error}"),
};
let smudged_text = match &smudged_batch {
    Ok(batch) => format!("all {} lines parsed", batch.len()),
    Err(error) => format!("stopped: {error}"),
};
println!("Tidy batch: {tidy_text}");
println!("Smudged batch: {smudged_text}");

scene("totalLy", total_ly);
scene("nearest", nearest);
scene("faintest", faintest);
scene("byConstellation", &by_constellation);
scene("brightNames", bright_stars.iter().map(|record| record.name).collect::<Vec<&str>>());
scene("dimNames", dim_stars.iter().map(|record| record.name).collect::<Vec<&str>>());
scene("allOrNothing", Json::new().with("tidy", &tidy_text).with("smudged", &smudged_text));`,
      explanation:
        "sum and fold gather numbers in one pass, min_by_key and max_by pick the star itself (floats need max_by with total_cmp because f64 is not Ord). entry().or_default() groups names into a BTreeMap, which keeps the constellations in alphabetical order. partition splits the records into two piles, and collecting an iterator of Results into a Result<Vec<_>, _> stops at the first Err, which is why the smudged batch reports the field count and builds nothing.",
      hints: [
        { id: "h1", title: "Numbers in one pass", content: "let total_ly: u32 = sheet_records.iter().map(|record| record.distance_ly).sum(); and let (nearest_ly, farthest_ly) = sheet_records.iter().fold((u32::MAX, 0), |(low, high), record| (low.min(record.distance_ly), high.max(record.distance_ly)));" },
        { id: "h2", title: "Picking the star", content: "nearest: sheet_records.iter().min_by_key(|record| record.distance_ly).map(|record| record.name).unwrap_or(\"nobody\"); faintest uses max_by(|a, b| a.magnitude.total_cmp(&b.magnitude)) because f64 has no Ord." },
        { id: "h3", title: "Groups, piles and batches", content: "by_constellation.entry(record.constellation).or_default().push(record.name); let (bright_stars, dim_stars): (Vec<&Record>, Vec<&Record>) = sheet_records.iter().partition(|record| record.magnitude < 1.0); let tidy_batch: Result<Vec<Record>, CatalogError> = tidy_lines.iter().map(|line| Record::parse(line)).collect(); Then match &tidy_batch { Ok(batch) => format!(\"all {} lines parsed\", batch.len()), Err(error) => format!(\"stopped: {error}\") }." },
      ],
      tests: [
        {
          id: "t1",
          description: "Totals and extremes come from one fold and two picks",
          assertionCode: js`
assert(lines.includes("Total distance 4098 ly, nearest 9 ly, farthest 2000 ly"), 'No line is exactly "Total distance 4098 ly, nearest 9 ly, farthest 2000 ly". total_ly is the sum of every distance_ly; nearest_ly and farthest_ly come from one fold that starts at (u32::MAX, 0).');
assert(lines.includes("Nearest star: Sirius; faintest star: Alnilam"), 'No line is exactly "Nearest star: Sirius; faintest star: Alnilam". Use min_by_key on distance_ly and max_by with total_cmp on magnitude (the largest magnitude number is the faintest star).');`,
        },
        {
          id: "t2",
          description: "Stars are grouped by constellation and split into bright and dim",
          assertionCode: js`
const want = ["Aquila: Altair", "Auriga: Capella", "Canis Major: Sirius, Adhara", "Canis Minor: Procyon", "Gemini: Pollux", "Leo: Regulus", "Orion: Rigel, Betelgeuse, Alnilam", "Taurus: Aldebaran", "7 bright, 4 dim"];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + ". Group names with entry(record.constellation).or_default().push(record.name) in a BTreeMap and print the groups in order; partition on magnitude < 1.0 for the piles.");`,
        },
        {
          id: "t3",
          description: "collect into a Result stops at the first error",
          assertionCode: js`
assert(lines.includes("Tidy batch: all 3 lines parsed"), 'No line is exactly "Tidy batch: all 3 lines parsed". Collect tidy_lines.iter().map(|line| Record::parse(line)).collect() into a Result<Vec<Record>, CatalogError> and print the length on Ok.');
assert(lines.includes("Smudged batch: stopped: expected 6 fields, found 5"), 'No line is exactly "Smudged batch: stopped: expected 6 fields, found 5". The smudged batch has a five-field line, so the collected Result is the first Err; print it with {error}.');`,
        },
        {
          id: "t4",
          description: "The observatory receives the aggregates",
          assertionCode: js`
assertEqual(scene.totalLy, 4098, 'Send scene("totalLy", total_ly);');
assertEqual(scene.nearest, "Sirius", 'Send scene("nearest", nearest);');
assertEqual(scene.faintest, "Alnilam", 'Send scene("faintest", faintest);');
const g = scene.byConstellation;
assert(g && typeof g === "object" && Array.isArray(g.Orion) && g.Orion.join(",") === "Rigel,Betelgeuse,Alnilam", 'Send scene("byConstellation", &by_constellation); Orion should list Rigel, Betelgeuse, Alnilam.');
assert(Array.isArray(scene.brightNames) && scene.brightNames.length === 7 && Array.isArray(scene.dimNames) && scene.dimNames.length === 4, "Send brightNames (7 names) and dimNames (4 names) from the two partition piles.");
const a = scene.allOrNothing;
assert(a && a.tidy === "all 3 lines parsed" && a.smudged === "stopped: expected 6 fields, found 5", 'Send scene("allOrNothing", Json::new().with("tidy", ..).with("smudged", ..)); with the two result texts.');`,
        },
      ],
      unlocks: ["ob-groups"],
      checks: [
        {
          prompt: "Why does `iter().max_by_key(|s| s.magnitude)` fail when `magnitude` is an `f64`?",
          question: {
            type: "choice",
            options: ["`f64` is not `Ord`: NaN has no place in a total order. Use `max_by` with `total_cmp`.", "`max_by_key` only works on strings", "Floats cannot be stored in structs", "The closure must return a reference"],
            answer: 0,
          },
          explanation: "`max_by_key` needs the key to be `Ord`, and floats are only `PartialOrd`. `max_by(|a, b| a.x.total_cmp(&b.x))` spells out how to compare them.",
        },
        {
          prompt: "`lines.iter().map(parse).collect::<Result<Vec<_>, _>>()` where the second of five lines fails. What do you get?",
          question: {
            type: "choice",
            options: ["`Ok` with four records", "`Err` holding the error from the second line", "`Err` holding all errors", "A panic"],
            answer: 1,
          },
          explanation: "Collecting into a `Result` is all or nothing: the first `Err` ends the collection and becomes the result. To keep every error, use a loop that pushes into two vectors.",
        },
        {
          prompt: "Why use a `BTreeMap` instead of a `HashMap` to print constellations?",
          question: {
            type: "choice",
            options: ["It is always faster", "It keeps keys in sorted order, so the output is the same every time", "It allows duplicate keys", "It does not need `use`"],
            answer: 1,
          },
          explanation: "A `HashMap` iterates in an unspecified order that can change between runs. A `BTreeMap` is ordered by key, which makes reports stable.",
        },
      ],
    },
    // ───────────────────────── 11 ─────────────────────────
    {
      id: "rust-inventory-11-own-iterator",
      title: "Writing your own iterator",
      minutes: 40,
      xp: 160,
      concepts: ["impl Iterator", "type Item", "next", "iterator state", "adaptors on your type", "E0046", "max_by_key ties"],
      learn: md`### An iterator is just a struct with a \`next\`

Every adaptor you used in the last two lessons works on anything that implements the **\`Iterator\`** trait. Its whole contract is:

~~~rust
trait Iterator {
    type Item;                              // what each step hands out
    fn next(&mut self) -> Option<Self::Item>;   // the next item, or None when finished
}
~~~

Implement \`next\` and you get \`map\`, \`filter\`, \`take\`, \`sum\`, \`collect\`, \`zip\` and dozens more for free, because they are all written once, in terms of \`next\`. That is what makes the trait powerful: you describe the *source*, the standard library supplies the pipeline.

### A counter that sweeps the sky

A telescope on a fixed mount watches the sky drift past: right ascension 0 hours, 1 hour, 2 hours ... up to 23. Model that sweep as a struct that remembers where it is:

~~~rust
struct Sweep {
    hour: u32,       // the next hour to hand out
    last: u32,       // the final hour to include
}

impl Iterator for Sweep {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.hour > self.last {
            return None;                     // finished: from now on always None
        }
        let current = self.hour;
        self.hour += 1;                      // advance the state
        Some(current)
    }
}
~~~

Three details carry the whole idea:

- **\`type Item = u32;\`** names what the iterator yields. Forget it and the compiler lists exactly what is missing:

~~~text
error[E0046]: not all trait items implemented, missing: \`Item\`
 --> main.rs:3:1
  |
3 | impl Iterator for Sweep {
  | ^^^^^^^^^^^^^^^^^^^^^^^ missing \`Item\` in implementation
  = help: implement the missing item: \`type Item = /* Type */;\`
~~~

- **\`&mut self\`**: stepping changes the iterator's own state, so \`next\` takes a mutable borrow. That is also why you must make the variable \`mut\` when you drive one by hand: \`let mut sweep = Sweep { hour: 0, last: 3 }; sweep.next();\`.
- **State lives in the fields.** Nothing is computed ahead. The struct is two numbers, however long the sweep.

### Using it with everything you know

~~~rust
let all_hours: Vec<u32> = Sweep { hour: 0, last: 23 }.collect();                          // 24 hours
let quarter_marks: Vec<u32> = Sweep { hour: 0, last: 23 }.filter(|hour| hour % 6 == 0).collect();   // [0, 6, 12, 18]
~~~

You can chain it into the data you already have. For each hour of the sweep, count the stars whose right ascension falls in it, and keep only the hours that have any:

~~~rust
let hour_stars: Vec<(u32, usize)> = Sweep { hour: 0, last: 23 }
    .map(|hour| (hour, sheet_records.iter().filter(|record| record.ra_hours as u32 == hour).count()))
    .filter(|(_, stars)| *stars > 0)
    .collect();
~~~

\`record.ra_hours as u32\` truncates 5.92 to 5 (the cast from float to integer drops the fraction), and the closure in \`filter\` takes the tuple apart with a pattern, \`|(_, stars)|\`, ignoring the hour with \`_\`.

### Ties and \`max_by_key\`

~~~rust
let busiest = hour_stars.iter().max_by_key(|(_, stars)| *stars).map(|(hour, _)| *hour).unwrap_or(0);
~~~

Remember from last lesson that \`max_by_key\` returns the **last** of several equal maxima. Here hour 5 has four stars and nothing ties it, but if two hours tied, the later hour would win. Know what your tie-break is.

### Iterators are single-use

Drive a \`Sweep\` to the end and it stays finished: \`next\` keeps answering \`None\`. To go again, build a new one. That is why the code above writes \`Sweep { hour: 0, last: 23 }\` each time. In real programs you would add a constructor function; here the literal keeps every piece of state visible.

You also write *infinite* iterators the same way (never return \`None\`) and then use \`take(n)\` to cut them. Every \`for\` loop you have ever written is a call to \`into_iter\` followed by repeated \`next\`: the \`for\` loop is sugar for the trait you just implemented.

### Common mistakes

- Forgetting \`type Item\` or declaring a different type than \`next\` returns.
- Advancing the state *after* building the \`Some\` value in the wrong order (so the first item is skipped or repeated).
- Using a stale iterator: after exhaustion it is empty.
- Making the struct hold a \`Vec\` and cloning it on each \`next\`. Keep an index instead.`,
      mission: md`The telescope's drift scan walks the sky one hour of right ascension at a time. The scan is a perfect fit for an iterator: a tiny piece of state, no list built in advance. Write \`Sweep\`, then put every adaptor you know to work on it, including your records, to see which hours of the night are crowded.

The **Drift scan** draws the 24-hour ruler, lights each hour your iterator yielded and stacks the stars found in each hour.`,
      tasks: [
        "Above the divider define struct Sweep { hour: u32, last: u32 } and impl Iterator for Sweep with type Item = u32 and a next that returns None once hour is past last, otherwise the current hour while advancing it",
        "In main collect all_hours: Vec<u32> from Sweep { hour: 0, last: 23 } and print The sweep visits 24 hours, from 0 to 23 (length, first, last)",
        "Collect quarter_marks with filter(|hour| hour % 6 == 0) and print Quarter marks: [0, 6, 12, 18] (the {:?} of the Vec)",
        "Build hour_stars: Vec<(u32, usize)> by mapping each hour to how many sheet_records have ra_hours as u32 equal to it, keeping hours with at least one star; print each as ` 4 h: 1 star(s)` using {hour:>2} for the hour",
        "Find busiest with max_by_key on the star count and print Busiest hour: 5 h",
        "Send sweepHours (&all_hours) and hourStars (one Json per entry with hour and stars)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: your own iterator. Write these in this part of the file (above main):
// struct Sweep { hour: u32, last: u32 }
// impl Iterator for Sweep { type Item = u32;  fn next(&mut self) -> Option<u32> }       None when hour > last, otherwise hand out hour and add one
${MAIN_DIVIDER}
// let all_hours: Vec<u32> = Sweep { hour: 0, last: 23 }.collect();       print:  The sweep visits 24 hours, from 0 to 23
// let quarter_marks: Vec<u32> = Sweep { hour: 0, last: 23 }.filter(|hour| hour % 6 == 0).collect();       print:  Quarter marks: [0, 6, 12, 18]
// let hour_stars: Vec<(u32, usize)> = Sweep { hour: 0, last: 23 }.map(|hour| (hour, <how many sheet_records have record.ra_hours as u32 == hour>)).filter(|(_, stars)| *stars > 0).collect();
// for (hour, stars) in &hour_stars { print   " 4 h: 1 star(s)"   -> println!("{hour:>2} h: {stars} star(s)") }
// let busiest = hour_stars.iter().max_by_key(|(_, stars)| *stars).map(|(hour, _)| *hour).unwrap_or(0);       print:  Busiest hour: 5 h
// scene("sweepHours", &all_hours);     scene("hourStars", ...Vec<Json> with hour and stars)
`,
      solutionAdd: rs`struct Sweep {
    hour: u32,
    last: u32,
}

impl Iterator for Sweep {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.hour > self.last {
            return None;
        }
        let current = self.hour;
        self.hour += 1;
        Some(current)
    }
}
${MAIN_DIVIDER}
// Lesson 11: your own iterator.
let all_hours: Vec<u32> = Sweep { hour: 0, last: 23 }.collect();
println!("The sweep visits {} hours, from {} to {}", all_hours.len(), all_hours[0], all_hours[all_hours.len() - 1]);

let quarter_marks: Vec<u32> = Sweep { hour: 0, last: 23 }.filter(|hour| hour % 6 == 0).collect();
println!("Quarter marks: {quarter_marks:?}");

let hour_stars: Vec<(u32, usize)> = Sweep { hour: 0, last: 23 }
    .map(|hour| (hour, sheet_records.iter().filter(|record| record.ra_hours as u32 == hour).count()))
    .filter(|(_, stars)| *stars > 0)
    .collect();
for (hour, stars) in &hour_stars {
    println!("{hour:>2} h: {stars} star(s)");
}
let busiest = hour_stars.iter().max_by_key(|(_, stars)| *stars).map(|(hour, _)| *hour).unwrap_or(0);
println!("Busiest hour: {busiest} h");

scene("sweepHours", &all_hours);
scene(
    "hourStars",
    hour_stars.iter().map(|(hour, stars)| Json::new().with("hour", *hour).with("stars", *stars)).collect::<Vec<Json>>(),
);`,
      explanation:
        "Sweep keeps its whole state in two numbers and next() hands out the current hour before advancing it, returning None once the hour passes last. Because it implements Iterator, collect, filter and map work on it with no extra code. For each hour the closure counts the sheet records whose right ascension, truncated by 'as u32', equals that hour, and the filter drops the empty hours.",
      hints: [
        { id: "h1", title: "The struct and next()", content: "struct Sweep { hour: u32, last: u32 } impl Iterator for Sweep { type Item = u32; fn next(&mut self) -> Option<u32> { if self.hour > self.last { return None; } let current = self.hour; self.hour += 1; Some(current) } }" },
        { id: "h2", title: "Using it", content: "let all_hours: Vec<u32> = Sweep { hour: 0, last: 23 }.collect(); Each use needs a fresh Sweep, because a finished iterator stays finished. println!(\"Quarter marks: {quarter_marks:?}\");" },
        { id: "h3", title: "Stars per hour", content: ".map(|hour| (hour, sheet_records.iter().filter(|record| record.ra_hours as u32 == hour).count())).filter(|(_, stars)| *stars > 0).collect() and for the busiest hour hour_stars.iter().max_by_key(|(_, stars)| *stars).map(|(hour, _)| *hour).unwrap_or(0)" },
      ],
      tests: [
        {
          id: "t1",
          description: "The Sweep iterator visits all 24 hours",
          assertionCode: js`
assert(lines.includes("The sweep visits 24 hours, from 0 to 23"), 'No line is exactly "The sweep visits 24 hours, from 0 to 23". Sweep { hour: 0, last: 23 } should yield 0, 1, 2, ... 23: return None only when hour is greater than last.');
assert(lines.includes("Quarter marks: [0, 6, 12, 18]"), 'No line is exactly "Quarter marks: [0, 6, 12, 18]". Filter a fresh Sweep for hours divisible by 6 and print the Vec with {:?}.');`,
        },
        {
          id: "t2",
          description: "Stars are counted per hour of right ascension",
          assertionCode: js`
const want = [" 4 h: 1 star(s)", " 5 h: 4 star(s)", " 6 h: 2 star(s)", " 7 h: 2 star(s)", "10 h: 1 star(s)", "19 h: 1 star(s)", "Busiest hour: 5 h"];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + JSON.stringify(missing) + ". Map each hour to the number of sheet_records whose ra_hours as u32 equals it, drop empty hours and print with {hour:>2} so single digits are padded.");`,
        },
        {
          id: "t3",
          description: "The observatory receives the sweep",
          assertionCode: js`
assert(Array.isArray(scene.sweepHours) && scene.sweepHours.length === 24 && scene.sweepHours[23] === 23, 'Send scene("sweepHours", &all_hours); with the 24 hours.');
const h = scene.hourStars;
assert(Array.isArray(h) && h.length === 6, 'Send scene("hourStars", ...); with one entry per busy hour (6).');
assertEqual(h.map((x) => x.hour + ":" + x.stars).join(","), "4:1,5:4,6:2,7:2,10:1,19:1", "hourStars entries should be hour and stars");`,
        },
      ],
      unlocks: ["ob-sweep"],
      checks: [
        {
          prompt: "What must a type provide to implement `Iterator`?",
          question: {
            type: "choice",
            options: ["`type Item` and `fn next(&mut self) -> Option<Self::Item>`", "A `Vec` field", "`fn iter(&self)` and `fn len(&self)`", "A lifetime parameter"],
            answer: 0,
          },
          explanation: "Only those two. Everything else (`map`, `filter`, `sum`, `collect`, ...) has a default implementation built on `next`.",
        },
        {
          prompt: "A `Sweep` has been collected once. What does collecting the same variable again give you?",
          question: {
            type: "choice",
            options: ["The same hours again", "An empty result: the iterator is exhausted (and the first `collect` also consumed the variable)", "A panic", "Only the last hour"],
            answer: 1,
          },
          explanation: "Iterators carry their position. Once `next` has returned `None` it stays finished, and consuming adaptors like `collect` take the iterator by value anyway. Build a fresh one for each pass.",
        },
      ],
    },
    // ───────────────────────── 12 ─────────────────────────
    {
      id: "rust-inventory-12-display",
      title: "Display and Debug for report types",
      minutes: 45,
      xp: 170,
      concepts: ["impl Display", "write! and writeln!", "width / fill / alignment", "precision", "{:#?}", "derive Debug", "named width$", "f.pad"],
      learn: md`### Two faces for every type

You have seen both formats of printing:

- **\`{:?}\` Debug** is for programmers: derived automatically, shows the structure (\`Record { name: "Sirius", ... }\`).
- **\`{}\` Display** is for readers: written by you, shows whatever layout you decide.

Lesson 5 implemented Display for an error. Now do it for the types that make up your **reports**, where the interesting part is *layout*: aligned columns, fixed widths, rounded numbers.

### Display for a record

~~~rust
impl fmt::Display for Record<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:<11}{:<13}{:>6.2}{:>7} ly", self.name, self.constellation, self.magnitude, self.distance_ly)
    }
}
~~~

\`Record<'_>\` says "a Record with some borrow I do not need to name" (the impl does not care how long the text lives). With this in place \`println!("{record}")\` and \`record.to_string()\` print one tidy row.

### The format mini-language

Everything after the colon in \`{...}\` is a **format spec**. In order, all optional: \`[[fill]align][sign][0][width][.precision][type]\`.

- \`{:<11}\`: left-align in 11 columns. \`{:<11}\` of \`"Sirius"\` gives \`Sirius     \`.
- \`{:>7}\`: right-align in 7 columns. \`{:>7}\` of \`9\` gives \`      9\`.
- \`{:^9}\`: centre in 9 columns. \`{:^9}\` of \`"Vega"\` gives \`  Vega   \`.
- \`{:-^30}\`: centre with a fill character. \`{:-^30}\` of \`" Night 41 "\` gives \`---------- Night 41 ----------\`.
- \`{:.2}\`: two decimals. \`{:.2}\` of \`0.126\` gives \`0.13\`.
- \`{:>6.2}\`: width 6 and 2 decimals. \`{:>6.2}\` of \`-1.46\` gives \` -1.46\`.
- \`{:+}\`: always show the sign. \`{:+}\` of \`3\` gives \`+3\`.
- \`{:08.3}\`: zero-pad to width 8. \`{:08.3}\` of \`6.75\` gives \`0006.750\`.
- \`{:>width$}\`: width from a named argument. \`{:>width$}\` with \`width = 8\` gives right-aligned in 8.

Without an alignment, text is left-aligned and numbers are right-aligned. The width counts characters. If the value is longer than the width, nothing is cut: the column just overflows. A dynamic width reads naturally when you compute it from data:

~~~rust
let longest_name = sheet_records.iter().map(|record| record.name.len()).max().unwrap_or(0);
println!("[{:>width$}] [{:<width$}] [{:^width$}]", "Altair", "Altair", "Altair", width = longest_name + 2);
~~~

A header row uses the same widths as the data rows, so columns line up: \`println!("{:<11}{:<13}{:>6}{:>10}", "STAR", "CONSTELLATION", "MAG", "DISTANCE")\`. (The last width is 10 because a data row ends with \`{:>7} ly\`: seven plus " ly".)

### A multi-line report: write! and writeln!

A card is several lines, so use \`writeln!\` (adds a newline) for every line except the last, and chain the results with \`?\`:

~~~rust
impl fmt::Display for NightSummary {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "{:-^30}", format!(" Night {} ", self.night))?;
        writeln!(f, "{:<10}{:>20}", "stars", self.stars)?;
        writeln!(f, "{:<10}{:>20}", "nearest", self.nearest)?;
        writeln!(f, "{:<10}{:>20}", "faintest", self.faintest)?;
        write!(f, "{:<10}{:>17} ly", "total", self.total_ly)
    }
}
~~~

\`?\` here is the same operator as before: each \`writeln!\` returns a \`fmt::Result\`, and \`?\` returns early if one fails. The last expression, without \`?\` or a semicolon, is the function's own result. Leaving the final newline off means \`println!("{summary}")\` ends the card exactly once.

The title uses \`format!\` first because a width applies to **one value**: you need the whole phrase as a single string to centre it.

### A catch: width and your own Display

\`{:>10}\` applied to a *record* does nothing if your \`fmt\` simply calls \`write!\`, because the width belongs to the Formatter and \`write!\` ignores it. Honour it by building the text and handing it to \`f.pad(&text)\`. For this lesson's types the layout is fixed inside \`fmt\`, so it does not matter, but you will meet the surprise.

### Debug, derived and pretty

~~~rust
#[derive(Debug)]
struct NightSummary { night: u32, stars: usize, nearest: String, faintest: String, total_ly: u32 }

println!("{:?}", summary);    // NightSummary { night: 41, stars: 11, nearest: "Sirius", ... }  on one line
println!("{:#?}", summary);   // the same, one field per line, indented
~~~

\`{:#?}\` is the pretty form and a good friend while developing. Notice that Debug shows the strings with quotes and the field names: exactly what you want when hunting a bug and exactly what you do not want in a report.

### Common mistakes

- Using \`{:?}\` where a person will read the output.
- Counting columns by eye. Use the same width constants in the header and the rows.
- Putting a width on a custom Display type and wondering why nothing happens (see \`f.pad\`).
- A trailing newline inside \`fmt\` followed by \`println!\`, which prints a blank line.`,
      mission: md`Reports get read by people on paper at three in the morning, so they must line up. Give \`Record\` a one-line Display and add a \`NightSummary\` card that totals the sheet. Then look at the same data through Debug and pretty-Debug to see why the two formats exist.

The **Report cards** panel shows your rows in a monospace table with the header above, the summary card, and the Debug line underneath.`,
      tasks: [
        "Above the divider implement fmt::Display for Record<'_> with write!(f, \"{:<11}{:<13}{:>6.2}{:>7} ly\", name, constellation, magnitude, distance_ly)",
        "Define #[derive(Debug)] struct NightSummary { night: u32, stars: usize, nearest: String, faintest: String, total_ly: u32 } and implement Display with writeln! lines: a title centred with - fill in width 30 (\" Night 41 \" built with format!), then stars, nearest and faintest with {:<10}{:>20}, and a last line total as {:<10}{:>17} ly (no newline at the end)",
        "In main print the header with {:<11}{:<13}{:>6}{:>10} for STAR, CONSTELLATION, MAG and DISTANCE, then the first four sheet_records with {record}",
        "Collect rows: Vec<String> with format! for every record. Build summary with night 41, the record count, nearest and faintest as Strings (to_string()) and total_ly, and print it with {summary}",
        "Print the Debug form of the first record ({:?}) and the pretty form of summary ({:#?})",
        "Compute longest_name from sheet_records and print [      Altair] [Altair      ] [   Altair   ] using {:>width$}, {:<width$} and {:^width$} with width = longest_name + 2",
        "Send rows (&rows), summaryCard (summary.to_string()) and debugLine (format!(\"{:?}\", sheet_records[0]))",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: Display and Debug. Write these in this part of the file (above main):
// impl fmt::Display for Record<'_>         write!(f, "{:<11}{:<13}{:>6.2}{:>7} ly", self.name, self.constellation, self.magnitude, self.distance_ly)
// #[derive(Debug)] struct NightSummary { night: u32, stars: usize, nearest: String, faintest: String, total_ly: u32 }
// impl fmt::Display for NightSummary       writeln!(f, "{:-^30}", format!(" Night {} ", self.night))?;  then stars / nearest / faintest  "{:<10}{:>20}";  last: write!(f, "{:<10}{:>17} ly", "total", ..)
${MAIN_DIVIDER}
// println!("{:<11}{:<13}{:>6}{:>10}", "STAR", "CONSTELLATION", "MAG", "DISTANCE");          then the first four records with {record}
// let rows: Vec<String> = sheet_records.iter().map(|record| format!("{record}")).collect();
// let summary = NightSummary { night: 41, stars: sheet_records.len(), nearest: nearest.to_string(), faintest: faintest.to_string(), total_ly };      println!("{summary}");
// println!("{:?}", sheet_records[0]);        println!("{:#?}", summary);
// let longest_name = ...;     print:  [      Altair] [Altair      ] [   Altair   ]       (width = longest_name + 2)
// scene("rows", &rows);    scene("summaryCard", summary.to_string());    scene("debugLine", format!("{:?}", sheet_records[0]));
`,
      solutionAdd: rs`impl fmt::Display for Record<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:<11}{:<13}{:>6.2}{:>7} ly", self.name, self.constellation, self.magnitude, self.distance_ly)
    }
}

#[derive(Debug)]
struct NightSummary {
    night: u32,
    stars: usize,
    nearest: String,
    faintest: String,
    total_ly: u32,
}

impl fmt::Display for NightSummary {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "{:-^30}", format!(" Night {} ", self.night))?;
        writeln!(f, "{:<10}{:>20}", "stars", self.stars)?;
        writeln!(f, "{:<10}{:>20}", "nearest", self.nearest)?;
        writeln!(f, "{:<10}{:>20}", "faintest", self.faintest)?;
        write!(f, "{:<10}{:>17} ly", "total", self.total_ly)
    }
}
${MAIN_DIVIDER}
// Lesson 12: Display and Debug.
println!("{:<11}{:<13}{:>6}{:>10}", "STAR", "CONSTELLATION", "MAG", "DISTANCE");
for record in sheet_records.iter().take(4) {
    println!("{record}");
}
let rows: Vec<String> = sheet_records.iter().map(|record| format!("{record}")).collect();

let summary = NightSummary {
    night: 41,
    stars: sheet_records.len(),
    nearest: nearest.to_string(),
    faintest: faintest.to_string(),
    total_ly,
};
println!("{summary}");
println!("{:?}", sheet_records[0]);
println!("{:#?}", summary);

let longest_name = sheet_records.iter().map(|record| record.name.len()).max().unwrap_or(0);
println!("[{:>width$}] [{:<width$}] [{:^width$}]", "Altair", "Altair", "Altair", width = longest_name + 2);

scene("rows", &rows);
scene("summaryCard", summary.to_string());
scene("debugLine", format!("{:?}", sheet_records[0]));`,
      explanation:
        "The format spec {:<11}{:<13}{:>6.2}{:>7} left-aligns the text columns, right-aligns the numbers and rounds the magnitude to two decimals, so every row has the same width. The summary card centres its title with a fill character, uses writeln! for every line but the last and chains the results with ?. Debug (derived) prints the structure on one line, and {:#?} prints the same fields one per line, which is the form for debugging rather than for readers.",
      hints: [
        { id: "h1", title: "The record row", content: "impl fmt::Display for Record<'_> { fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { write!(f, \"{:<11}{:<13}{:>6.2}{:>7} ly\", self.name, self.constellation, self.magnitude, self.distance_ly) } } The module is fmt, the trait is fmt::Display and the method is fmt." },
        { id: "h2", title: "The summary card", content: "writeln!(f, \"{:-^30}\", format!(\" Night {} \", self.night))?; writeln!(f, \"{:<10}{:>20}\", \"stars\", self.stars)?; ... and finish with write!(f, \"{:<10}{:>17} ly\", \"total\", self.total_ly) as the last expression, with no ? and no semicolon." },
        { id: "h3", title: "Dynamic width", content: "let longest_name = sheet_records.iter().map(|record| record.name.len()).max().unwrap_or(0); println!(\"[{:>width$}] [{:<width$}] [{:^width$}]\", \"Altair\", \"Altair\", \"Altair\", width = longest_name + 2); (the longest name is Betelgeuse with 10 letters, so the width is 12)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Record rows line up in columns",
          assertionCode: js`
const want = [
  "STAR       CONSTELLATION   MAG  DISTANCE",
  "Sirius     Canis Major   -1.46      9 ly",
  "Capella    Auriga         0.08     43 ly",
  "Rigel      Orion          0.13    860 ly",
  "Procyon    Canis Minor    0.34     11 ly",
];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + JSON.stringify(missing) + '. The row format is "{:<11}{:<13}{:>6.2}{:>7} ly" and the header uses "{:<11}{:<13}{:>6}{:>10}". Count the spaces: they matter.');`,
        },
        {
          id: "t2",
          description: "The summary card is centred and aligned",
          assertionCode: js`
const want = ["---------- Night 41 ----------", "stars                       11", "nearest                 Sirius", "faintest               Alnilam", "total                  4098 ly"];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + JSON.stringify(missing) + '. Title: writeln!(f, "{:-^30}", format!(" Night {} ", self.night)). Rows: "{:<10}{:>20}" and the last one "{:<10}{:>17} ly".');`,
        },
        {
          id: "t3",
          description: "Debug and pretty Debug show the structure",
          assertionCode: js`
assert(lines.includes('Record { name: "Sirius", constellation: "Canis Major", ra_hours: 6.75, dec_deg: -16.72, magnitude: -1.46, distance_ly: 9 }'), "Print the first record with {:?}; Record already derives Debug.");
assert(lines.includes("NightSummary {") && lines.includes('    nearest: "Sirius",'), 'Print summary with {:#?}: the pretty form has a line NightSummary { and one field per line, such as     nearest: "Sirius",');
assert(lines.includes("[      Altair] [Altair      ] [   Altair   ]"), 'No line is exactly "[      Altair] [Altair      ] [   Altair   ]". Use {:>width$}, {:<width$} and {:^width$} with width = longest_name + 2 (the longest name, Betelgeuse, has 10 letters).');`,
        },
        {
          id: "t4",
          description: "The observatory receives the report cards",
          assertionCode: js`
const r = scene.rows;
assert(Array.isArray(r) && r.length === 11, 'Send scene("rows", &rows); with one formatted row per record (11).');
assertEqual(r[0], "Sirius     Canis Major   -1.46      9 ly", "The first row should be the Display of the first record");
assert(typeof scene.summaryCard === "string" && scene.summaryCard.split("\n").length === 5, 'Send scene("summaryCard", summary.to_string()); it should have five lines.');
assert(typeof scene.debugLine === "string" && scene.debugLine.startsWith("Record {"), 'Send scene("debugLine", format!("{:?}", sheet_records[0]));');`,
        },
      ],
      unlocks: ["ob-cards"],
      checks: [
        {
          prompt: "What does `format!(\"{:>6.2}\", -1.456)` produce?",
          question: { type: "text", answer: [" -1.46", "' -1.46'", "\" -1.46\""] },
          explanation: "`.2` rounds to two decimals (-1.46) and `>6` right-aligns in six columns, so one space of padding goes in front.",
        },
        {
          prompt: "Which format spec centres a value in 30 columns, padding with `-`?",
          question: {
            type: "choice",
            options: ["`{:30-^}`", "`{:-^30}`", "`{:^-30}`", "`{:30^-}`"],
            answer: 1,
          },
          explanation: "The order is fill, alignment, width: `-` (fill), `^` (centre), `30` (width).",
        },
        {
          prompt: "In a multi-line `fmt`, why does the last `write!` have no `?` and no semicolon?",
          question: {
            type: "choice",
            options: ["It is a typo", "It is the function's final expression, so its `fmt::Result` is returned directly", "`write!` cannot fail", "Semicolons are forbidden in `fmt`"],
            answer: 1,
          },
          explanation: "The earlier lines use `?` to bail out on failure. The final `write!` already returns the `fmt::Result` the function must return, so it is simply the last expression.",
        },
      ],
    },
  ],
};
