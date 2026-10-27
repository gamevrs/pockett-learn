import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 1: Borrowed text. Slices into one buffer, lifetimes (functions, then structs) and modules.
 *
 * Lesson 1's starter carries the whole skeleton: the provided helper (`scene`, `Json`, `offset_in`)
 * above `fn main()`. From lesson 2 on, a lesson's text may hold MAIN_DIVIDER (engine/compose.ts):
 * what is above it goes before `fn main()`, what is below it joins main's body.
 */

/** The helper every lesson relies on. Items go above main in a Rust file. */
export const SCENE_HELPER = rs`// Provided by pockett: sends values to the live observatory beside your editor.
// You call  scene("name", value);  and build objects with Json::new().with("key", value).
// Leave everything down to fn main alone. (Pass a String, a Vec or a map with a leading &, like &names.)
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
impl<K: AsRef<str>, V: ToJson> ToJson for std::collections::BTreeMap<K, V> {
    fn to_json(&self) -> String {
        let parts: Vec<String> = self.iter().map(|(key, value)| format!("{}: {}", quote(key.as_ref()), value.to_json())).collect();
        format!("{{{}}}", parts.join(", "))
    }
}
impl<K: AsRef<str>, V: ToJson> ToJson for std::collections::HashMap<K, V> {
    fn to_json(&self) -> String {
        let parts: Vec<String> = self.iter().map(|(key, value)| format!("{}: {}", quote(key.as_ref()), value.to_json())).collect();
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
}

// Where does part sit inside whole? Some(byte offset) when it is a slice of that very text,
// None when it lives somewhere else (a copy, another String). A &str is just an address and a length.
fn offset_in(whole: &str, part: &str) -> Option<usize> {
    let start = (part.as_ptr() as usize).checked_sub(whole.as_ptr() as usize)?;
    if start + part.len() <= whole.len() { Some(start) } else { None }
}`;

export const chapter1: Chapter = {
  id: "borrowed-text",
  title: "Borrowed text",
  blurb: "Read a whole night log without copying it: slices, lifetimes, structs that borrow and modules that keep the code tidy.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "rust-inventory-1-buffer",
      title: "One buffer, many views",
      minutes: 35,
      xp: 120,
      concepts: ["String vs &str", "slices", "split_once", "lines", "to_string", "offset_in", "E0308", "E0505"],
      learn: md`### What you already know, and what is hiding in it

In Reef Station you met two kinds of text. A **\`String\`** owns its characters: it holds them on the heap and frees them when it goes out of scope. A **\`&str\`** borrows text that somebody else owns. This lesson looks inside that borrow, because the rest of the course (lifetimes, parsers, iterators) all hangs on one fact:

**A \`&str\` is only two numbers: where the text starts and how many bytes long it is.** It never holds the text itself.

~~~text
buffer (a String, owns the bytes)
  S i r i u s | C a n i s   M a j o r | 6 . 7 5 ...
  ^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^
  star_name     constellation          each is (start address, length)
  start+0, 6    start+7, 11            no bytes were copied
~~~

That is why slicing is cheap: cutting a 10-megabyte file into a million lines costs a million pairs of numbers, not ten more megabytes. It is also why Rust must be careful about it. A view is only meaningful while the buffer it points into is still alive. Hold that thought until the next lesson.

### Making slices

~~~rust
let first_line: &str = buffer.lines().next().unwrap_or("");           // one line, still inside buffer
let (star_name, rest) = first_line.split_once('|').unwrap_or((first_line, ""));
let constellation: &str = rest.split('|').next().unwrap_or("");
let by_range: &str = &buffer[0..6];                                     // bytes 0 up to (not including) 6
~~~

- \`lines()\`, \`split('|')\`, \`trim()\` and \`split_once(sep)\` all return **views** into the text you called them on. Nothing is allocated.
- \`split_once\` returns an \`Option<(&str, &str)>\`: the part before the first separator and the part after it, or \`None\` when the separator is missing. That is why the lesson ends it with \`unwrap_or\`.
- \`&buffer[a..b]\` slices by **byte** position. The range is half open: it includes \`a\` and stops before \`b\`.

You cannot index a string with a single number. \`buffer[0]\` is rejected on purpose, because a character can be several bytes wide:

~~~text
error[E0277]: the type \`str\` cannot be indexed by \`{integer}\`
 --> main.rs:4:24
  |
4 |     let first = buffer[0];
  |                        ^ string indices are ranges of \`usize\`
  = note: you can use \`.chars().nth()\` or \`.bytes().nth()\`
~~~

And if a byte range cuts a character in half, the program stops with a panic instead of producing broken text:

~~~text
thread 'main' panicked at main.rs:4:20:
end byte index 4 is not a char boundary; it is inside 'é' (bytes 3..5 of string)
~~~

Methods such as \`split\`, \`find\` and \`split_once\` always cut on boundaries, so prefer them over hand-counted ranges.

### Copying on purpose

\`star_name.to_string()\` (or \`String::from(star_name)\`, or \`.to_owned()\`) makes a **new String** with its own bytes somewhere else. You do that when you need text that outlives the buffer, text you want to change, or text you build from pieces:

~~~rust
fn star_label(name: &str, constellation: &str) -> String {
    format!("{name} ({constellation})")      // new text, so the function returns an owned String
}
~~~

The parameters are \`&str\`, not \`String\`: the function only needs to *look*. Passing a \`&String\` works too, because Rust quietly turns \`&String\` into \`&str\` where a \`&str\` is expected (a *deref coercion*). Passing the String itself does not:

~~~text
error[E0308]: mismatched types
 --> main.rs:6:26
  |
6 |     println!("{}", shout(owned));
  |                    ----- ^^^^^ expected \`&str\`, found \`String\`
help: consider borrowing here
  |
6 |     println!("{}", shout(&owned));
~~~

A good rule: **take \`&str\`, return \`String\` when you build something new.**

### Proving where a slice points

The helper above \`main\` has a small function you did not write: \`offset_in(whole, part)\`. It subtracts two addresses to answer "where inside \`whole\` does \`part\` start?":

~~~rust
offset_in(&buffer, star_name)      // Some(0)   a slice of the buffer
offset_in(&buffer, constellation)  // Some(7)   also a slice of the buffer
offset_in(&buffer, &name_copy)     // None      a copy lives somewhere else
~~~

Real programs never need this; it is here so the observatory beside your editor can draw each view *inside* the buffer and each copy outside it. Look for the blue ranges and the dashed copy.

### Why the compiler will care

A slice must not outlive the text it points into. Try to throw the buffer away while a view is still in use and the compiler refuses:

~~~text
error[E0505]: cannot move out of \`buffer\` because it is borrowed
 --> main.rs:5:10
  |
4 |     let name = &buffer[0..6];
  |                 ------ borrow of \`buffer\` occurs here
5 |     drop(buffer);
  |          ^^^^^^ move out of \`buffer\` occurs here
6 |     println!("{}", name);
  |                    ---- borrow later used here
~~~

That one rule, "the borrow must end before the owner goes away", is what lifetimes are about. The next two lessons make it explicit in function signatures and in structs.

### Common mistakes

- Writing \`let s: &str = buffer;\` (a String where a &str is expected) instead of \`&buffer\`.
- Reaching for \`to_string()\` everywhere "to make the errors go away". A copy per field is exactly the cost slices avoid.
- Slicing with hand-counted byte ranges on text that may contain non-ASCII letters.
- Forgetting that \`split_once\` returns an \`Option\`.`,
      mission: md`Corvid Peak Observatory sits above the cloud line, and for a hundred and forty years its night assistants have written what they saw in notebooks. Last winter somebody typed every notebook into one text file: one star per line, fields separated by \`|\`. Your job for the whole course is the **importer** that turns that file into trustworthy data.

Tonight's first job is only to *look* at the text without copying it. A six-star sample is already in \`main\` as one \`String\`. Cut the first star's name and constellation out of it as slices, make one deliberate copy to compare, and watch the **Input buffer** show which pieces live inside the buffer and which do not.`,
      tasks: [
        "Above fn main write fn star_label(name: &str, constellation: &str) -> String that returns the text Sirius (Canis Major) style: format!(\"{name} ({constellation})\")",
        "In main take the first line of buffer as a &str: first_line, using buffer.lines().next().unwrap_or(\"\")",
        "Split it with split_once('|') into star_name and rest (use unwrap_or((first_line, \"\")) for the None case), then take constellation: the text of rest up to its next '|'",
        "Make an owned copy: let name_copy: String = star_name.to_string(); and build let label = star_label(star_name, constellation);",
        "Print Sirius is in Canis Major, then Label: Sirius (Canis Major), then Offsets: Some(0) Some(7) None using offset_in(&buffer, ...) with {:?} for star_name, constellation and &name_copy",
        "Send the scene: buffer (&buffer), slices (a Vec of two Json objects with label, start and len for the name and the constellation), copies (a vec with &name_copy) and label",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: one buffer, many views. Your code goes inside fn main() at the bottom, and star_label goes above it.
// 1. fn star_label(name: &str, constellation: &str) -> String      -> "Sirius (Canis Major)"
// 2. let first_line: &str = buffer.lines().next().unwrap_or("");
// 3. let (star_name, rest) = first_line.split_once('|').unwrap_or((first_line, ""));
//    let constellation: &str = rest.split('|').next().unwrap_or("");
// 4. let name_copy: String = star_name.to_string();     let label = star_label(star_name, constellation);
// 5. Print these three lines:
//      Sirius is in Canis Major
//      Label: Sirius (Canis Major)
//      Offsets: Some(0) Some(7) None          (offset_in(&buffer, ..) with {:?}: star_name, constellation, &name_copy)
// 6. scene("buffer", &buffer);   scene("copies", vec![&name_copy]);   scene("label", &label);
//    scene("slices", vec![ Json::new().with("label", "name").with("start", offset_in(&buffer, star_name)).with("len", star_name.len()), ... ]);
// Everything above fn main is the pockett helper: leave it as it is.

${SCENE_HELPER}

fn main() {
    // The night log, pasted from the observers' notebooks. One String owns all of it.
    let buffer: String = [
        "Sirius|Canis Major|6.75|-16.72|-1.46|9",
        "Canopus|Carina|6.40|-52.70|-0.74|310",
        "Arcturus|Bootes|14.26|19.18|-0.05|37",
        "Vega|Lyra|18.62|38.78|0.03|25",
        "Rigel|Orion|5.24|-8.20|0.13|860",
        "Altair|Aquila|19.85|8.87|0.76|17",
    ]
    .join("\n");

    // This placeholder keeps the file building. Replace it with your own lines.
    println!("TODO: slice the buffer ({} bytes)", buffer.len());
}`,
      solutionAdd: rs`// Lesson 1: slices of one buffer.
${SCENE_HELPER}

fn star_label(name: &str, constellation: &str) -> String {
    format!("{name} ({constellation})")
}

fn main() {
    // The night log, pasted from the observers' notebooks. One String owns all of it.
    let buffer: String = [
        "Sirius|Canis Major|6.75|-16.72|-1.46|9",
        "Canopus|Carina|6.40|-52.70|-0.74|310",
        "Arcturus|Bootes|14.26|19.18|-0.05|37",
        "Vega|Lyra|18.62|38.78|0.03|25",
        "Rigel|Orion|5.24|-8.20|0.13|860",
        "Altair|Aquila|19.85|8.87|0.76|17",
    ]
    .join("\n");

    // Lesson 1: slices of the buffer.
    let first_line: &str = buffer.lines().next().unwrap_or("");
    let (star_name, rest) = first_line.split_once('|').unwrap_or((first_line, ""));
    let constellation: &str = rest.split('|').next().unwrap_or("");
    let name_copy: String = star_name.to_string();
    let label = star_label(star_name, constellation);

    println!("{star_name} is in {constellation}");
    println!("Label: {label}");
    println!(
        "Offsets: {:?} {:?} {:?}",
        offset_in(&buffer, star_name),
        offset_in(&buffer, constellation),
        offset_in(&buffer, &name_copy)
    );

    scene("buffer", &buffer);
    scene(
        "slices",
        vec![
            Json::new().with("label", "name").with("start", offset_in(&buffer, star_name)).with("len", star_name.len()),
            Json::new().with("label", "constellation").with("start", offset_in(&buffer, constellation)).with("len", constellation.len()),
        ],
    );
    scene("copies", vec![&name_copy]);
    scene("label", &label);
}`,
      explanation:
        "buffer.lines().next() gives the first line as a &str that points into the buffer, split_once('|') cuts that line in two more views, and nothing is copied. offset_in compares addresses, so the two slices report their position (0 and 7) while name_copy, a separate allocation made by to_string(), reports None. star_label only needs to read its inputs, so it takes &str, and it returns a String because it builds new text with format!.",
      hints: [
        { id: "h1", title: "The first line and the split", content: "let first_line: &str = buffer.lines().next().unwrap_or(\"\"); then let (star_name, rest) = first_line.split_once('|').unwrap_or((first_line, \"\")); and let constellation: &str = rest.split('|').next().unwrap_or(\"\"); None of these allocate." },
        { id: "h2", title: "The function and the copy", content: "fn star_label(name: &str, constellation: &str) -> String { format!(\"{name} ({constellation})\") } goes above fn main. In main: let name_copy: String = star_name.to_string(); let label = star_label(star_name, constellation);" },
        { id: "h3", title: "Offsets and the scene", content: "println!(\"Offsets: {:?} {:?} {:?}\", offset_in(&buffer, star_name), offset_in(&buffer, constellation), offset_in(&buffer, &name_copy)); For the scene, slices is a vec![...] of Json::new().with(\"label\", \"name\").with(\"start\", offset_in(&buffer, star_name)).with(\"len\", star_name.len()) and the same for the constellation. Pass copies as vec![&name_copy]." },
      ],
      tests: [
        {
          id: "t1",
          description: "The first star is cut out of the buffer",
          assertionCode: js`assert(lines.includes("Sirius is in Canis Major"), 'No line is exactly "Sirius is in Canis Major". Slice the first line with lines().next(), split it at the first | with split_once, and print the two views.');`,
        },
        {
          id: "t2",
          description: "star_label builds an owned String",
          assertionCode: js`assert(lines.includes("Label: Sirius (Canis Major)"), 'No line is exactly "Label: Sirius (Canis Major)". Write star_label(name: &str, constellation: &str) -> String with format! and print its result after "Label: ".');`,
        },
        {
          id: "t3",
          description: "The offsets show the slices inside the buffer and the copy outside it",
          assertionCode: js`assert(lines.includes("Offsets: Some(0) Some(7) None"), 'No line is exactly "Offsets: Some(0) Some(7) None". Print offset_in(&buffer, star_name), offset_in(&buffer, constellation) and offset_in(&buffer, &name_copy) with {:?} holes. The copy should answer None.');`,
        },
        {
          id: "t4",
          description: "The observatory receives the buffer and the two slices",
          assertionCode: js`
assert(typeof scene.buffer === "string" && scene.buffer.startsWith("Sirius|Canis Major"), "Send the whole buffer with scene(\"buffer\", &buffer);");
const s = scene.slices;
assert(Array.isArray(s) && s.length === 2, "scene(\"slices\", ...) should hold two entries: the name and the constellation.");
assert(s[0].label === "name" && s[0].start === 0 && s[0].len === 6, "The first slice should be labelled name, start 0, len 6 (the text Sirius).");
assert(s[1].label === "constellation" && s[1].start === 7 && s[1].len === 11, "The second slice should be labelled constellation, start 7, len 11 (Canis Major).");`,
        },
        {
          id: "t5",
          description: "The owned copy and the label are sent too",
          assertionCode: js`
assert(Array.isArray(scene.copies) && scene.copies.length === 1 && scene.copies[0] === "Sirius", 'Send the copy with scene("copies", vec![&name_copy]); it should hold the single text Sirius.');
assertEqual(scene.label, "Sirius (Canis Major)", 'Send the label with scene("label", &label);');`,
        },
      ],
      unlocks: ["ob-buffer"],
      checks: [
        {
          prompt: "What does a `&str` actually contain?",
          question: {
            type: "choice",
            options: ["A copy of the characters", "An address and a length that point into text someone else owns", "A reference-counted pointer to the heap", "Only the length of the text"],
            answer: 1,
          },
          explanation: "A `&str` is a view: where the text starts and how many bytes it covers. Cutting a line out of a buffer therefore costs two numbers, not a copy of the line.",
        },
        {
          prompt: "`offset_in(&buffer, &name_copy)` answers `None`. Why?",
          question: {
            type: "choice",
            options: ["`name_copy` is empty", "`name_copy` is a separate String with its own bytes, not a slice of the buffer", "`offset_in` only works on the first line", "Strings cannot be borrowed"],
            answer: 1,
          },
          explanation: "`to_string()` allocates new memory and copies the characters there. The copy has its own address, so it is not inside the buffer.",
        },
        {
          prompt: "A function only needs to read a piece of text and return a new sentence built from it. What are the best parameter and return types?",
          question: {
            type: "choice",
            options: ["`String` in, `&str` out", "`&str` in, `String` out", "`&String` in, `&String` out", "`String` in, `String` out"],
            answer: 1,
          },
          explanation: "Borrow what you only read (`&str`, which also accepts `&String`) and return an owned `String` when you build brand new text with `format!`.",
        },
      ],
    },
    // ───────────────────────── 2 ─────────────────────────
    {
      id: "rust-inventory-2-lifetimes",
      title: "Lifetimes 1: why the compiler asks",
      minutes: 40,
      xp: 140,
      concepts: ["lifetime annotations", "'a", "E0106", "E0597", "E0515", "E0621", "returning a borrow"],
      learn: md`### The question behind every borrow

Last lesson ended with a rule: a view must not outlive the text it points into. For a variable you can see that rule with your own eyes. For a **function that returns a reference**, the compiler cannot see it unless you say so. Look at this function, which picks the brighter of two catalogue lines:

~~~rust
fn brighter(first: &str, second: &str) -> &str {
    // returns either first or second
}
~~~

The returned view points into *one of the two inputs*. Which one decides how long the result is safe to use, and the signature does not say. The compiler stops:

~~~text
error[E0106]: missing lifetime specifier
 --> main.rs:6:43
  |
6 | fn brighter(first: &str, second: &str) -> &str {
  |                    ----          ----     ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but the signature does not say whether it is borrowed from \`first\` or \`second\`
help: consider introducing a named lifetime parameter
  |
6 | fn brighter<'a>(first: &'a str, second: &'a str) -> &'a str {
  |            ++++         ++               ++          ++
~~~

Read that message: it is not complaining about your logic. It is asking a question, and it even prints the answer it would suggest.

### A lifetime is a name for "how long this borrow is valid"

~~~rust
fn brighter<'a>(first: &'a str, second: &'a str) -> &'a str {
    /* ... */
}
~~~

- \`<'a>\` declares a **lifetime parameter**, the way \`<T>\` would declare a type parameter. The name is yours (\`'a\`, \`'line\`, \`'buf\`); the apostrophe is the marker.
- \`&'a str\` reads "a string view that is valid for (at least) the region \`'a\`".
- Using the same \`'a\` on both inputs and on the output says: **the result is valid only as long as BOTH inputs are**. Rust picks \`'a\` at each call as the *overlap* of the two input lifetimes, the shorter of them.

Lifetimes **change nothing at run time**. They are a promise checked at compile time and then erased. The annotation does not make anything live longer; it only lets the compiler compare what you promised with what the body does.

### What the body is allowed to return

If your annotations say "the result borrows from \`first\` and \`second\`", then the body may return one of those, or a slice of one of those. It may not invent a view into something local:

~~~text
error[E0515]: cannot return reference to local variable \`label\`
 --> main.rs:4:5
  |
4 |     &label
  |     ^^^^^^ returns a reference to data owned by the current function
~~~

\`label\` is destroyed when the function ends, so a view of it would dangle. The fix is to return an owned \`String\` instead (lesson 1's \`star_label\` does exactly that).

When one input has the longer lifetime and you try to return the other without saying so, you get a sibling error:

~~~text
error[E0621]: explicit lifetime required in the type of \`b\`
 --> main.rs:3:33
  |
3 |     if a.len() > 3 { a } else { b }
  |                                 ^ lifetime \`'a\` required
help: add explicit lifetime \`'a\` to the type of \`b\`
~~~

### Where the result stops being valid

Annotating is only half the story; the other half is *using* the result. Because the result's lifetime is the overlap of the inputs, a result built from a short-lived input cannot escape that input's scope:

~~~rust
let word;
{
    let buffer = String::from("Sirius Canis Major");
    word = first_word(&buffer);          // word borrows from buffer
}                                        // buffer dies here
println!("{}", word);                    // word would dangle
~~~

~~~text
error[E0597]: \`buffer\` does not live long enough
 --> main.rs:7:27
  |
6 |         let buffer = String::from("Sirius Canis Major");
  |             ------ binding \`buffer\` declared here
7 |         word = first_word(&buffer);
  |                           ^^^^^^^ borrowed value does not live long enough
8 |     }
  |     - \`buffer\` dropped here while still borrowed
9 |     println!("{}", word);
  |                    ---- borrow later used here
~~~

The compiler shows you three places: where the owner is created, where it dies, and where the borrow is still being used. When you can point at those three spots yourself you have understood lifetimes. The usual cures are: use the result before the owner dies, move the owner to a longer-lived place, or **copy what you need out** (\`.to_string()\`) while the owner is still alive. This lesson's code does the last one on purpose.

### \`'static\`

A string literal such as \`"nobody"\` lives for the entire run of the program, so its lifetime is called \`'static\`. A function that can only return literals can say \`-> &'static str\`, as Reef Station's \`zone_for\` did. You will meet it again in lesson 4.

### Common mistakes

- Treating \`'a\` as an instruction ("keep this alive"). It is a description the compiler verifies.
- Adding \`'a\` to every reference in sight. Only references that must be *related* share a name.
- "Fixing" E0106 by returning \`String\` and cloning when a borrow was exactly what you wanted. Both are fine; choose on purpose.
- Returning a view of a local variable (E0515).`,
      mission: md`The assistants often have to choose between two lines of the log: the brighter star wins the telescope slot. A chooser that *copies* the winning line is wasteful, since the whole file is already sitting in the buffer. Teach the importer to return a **view** of the line it picked, and to say in its signature exactly how long that view is good for.

You will write \`field\` (the n-th \`|\` field of a line) and \`brighter\` (the line with the smaller magnitude; in astronomy a *smaller* number means a *brighter* star), try them on two lines, and copy a name out of an inner scope before the scope ends.`,
      tasks: [
        "Above the divider write fn field<'a>(line: &'a str, index: usize) -> &'a str that returns the index-th piece of line.split('|'), or \"\" when there is none (nth + unwrap_or)",
        "Write fn brighter<'a>(first: &'a str, second: &'a str) -> &'a str: read each line's magnitude with field(line, 4).trim().parse::<f64>() (use unwrap_or(99.0)) and return second only when its magnitude is smaller than first's, otherwise first",
        "In main take line_vega = buffer.lines().nth(3) and line_arcturus = buffer.lines().nth(2) (unwrap_or(\"\")), then let winner = brighter(line_vega, line_arcturus); and print Brighter of the two: Arcturus (the name is field 0 of winner)",
        "Declare let kept_name: String; then in an inner { } block make let scratch = String::from(\"Nova|Test|0.0|0.0|-9.99|1\"), pick = brighter(line_arcturus, &scratch), and assign kept_name = field(pick, 0).to_string(); after the block print Kept after the scratch note was dropped: Nova",
        "Send scene lifetimeDemo: a Json with first, second, winner (names), winnerStart (offset_in(&buffer, winner)), scratch (\"Nova\") and kept (&kept_name)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: lifetimes. Write these in this part of the file (above main):
// fn field<'a>(line: &'a str, index: usize) -> &'a str          the index-th |-field, or ""
// fn brighter<'a>(first: &'a str, second: &'a str) -> &'a str   smaller magnitude (field 4, parsed as f64, default 99.0) wins; ties keep first
${MAIN_DIVIDER}
// let line_vega = buffer.lines().nth(3).unwrap_or("");      let line_arcturus = buffer.lines().nth(2).unwrap_or("");
// let winner = brighter(line_vega, line_arcturus);          print:  Brighter of the two: Arcturus
// let kept_name: String;
// { let scratch = String::from("Nova|Test|0.0|0.0|-9.99|1");  let pick = brighter(line_arcturus, &scratch);  kept_name = field(pick, 0).to_string(); }
// print:  Kept after the scratch note was dropped: Nova
// scene("lifetimeDemo", Json::new().with("first", ..).with("second", ..).with("winner", ..).with("winnerStart", offset_in(&buffer, winner)).with("scratch", "Nova").with("kept", &kept_name));
`,
      solutionAdd: rs`fn field<'a>(line: &'a str, index: usize) -> &'a str {
    line.split('|').nth(index).unwrap_or("")
}

fn brighter<'a>(first: &'a str, second: &'a str) -> &'a str {
    let first_mag: f64 = field(first, 4).trim().parse().unwrap_or(99.0);
    let second_mag: f64 = field(second, 4).trim().parse().unwrap_or(99.0);
    if second_mag < first_mag {
        second
    } else {
        first
    }
}
${MAIN_DIVIDER}
// Lesson 2: lifetimes.
let line_vega = buffer.lines().nth(3).unwrap_or("");
let line_arcturus = buffer.lines().nth(2).unwrap_or("");
let winner = brighter(line_vega, line_arcturus);
println!("Brighter of the two: {}", field(winner, 0));

let kept_name: String;
{
    let scratch = String::from("Nova|Test|0.0|0.0|-9.99|1");
    let pick = brighter(line_arcturus, &scratch);
    kept_name = field(pick, 0).to_string();
}
println!("Kept after the scratch note was dropped: {kept_name}");

scene(
    "lifetimeDemo",
    Json::new()
        .with("first", field(line_vega, 0))
        .with("second", field(line_arcturus, 0))
        .with("winner", field(winner, 0))
        .with("winnerStart", offset_in(&buffer, winner))
        .with("scratch", "Nova")
        .with("kept", &kept_name),
);`,
      explanation:
        "Both inputs and the output share the lifetime 'a, which tells the compiler the result borrows from the inputs and is valid only as long as both are. Inside the block, pick may borrow from scratch, so it cannot leave the block; copying the name with to_string() while scratch is still alive gives kept_name an owner of its own that lasts beyond the block.",
      hints: [
        { id: "h1", title: "Declaring the lifetime", content: "fn field<'a>(line: &'a str, index: usize) -> &'a str { line.split('|').nth(index).unwrap_or(\"\") } The same 'a on the input and the output says the result is a view into line." },
        { id: "h2", title: "Choosing the brighter line", content: "Inside brighter, let first_mag: f64 = field(first, 4).trim().parse().unwrap_or(99.0); and the same for second. Then if second_mag < first_mag { second } else { first } returns one of the two borrowed inputs." },
        { id: "h3", title: "Copying out of the inner block", content: "let kept_name: String; { let scratch = String::from(\"Nova|Test|0.0|0.0|-9.99|1\"); let pick = brighter(line_arcturus, &scratch); kept_name = field(pick, 0).to_string(); } Without .to_string() the compiler reports E0597 because pick borrows from scratch, which dies at the closing brace." },
      ],
      tests: [
        {
          id: "t1",
          description: "brighter picks the line with the smaller magnitude",
          assertionCode: js`assert(lines.includes("Brighter of the two: Arcturus"), 'No line is exactly "Brighter of the two: Arcturus". Vega is 0.03 and Arcturus is -0.05, and a smaller magnitude is brighter, so brighter(line_vega, line_arcturus) should return the Arcturus line. Print field(winner, 0).');`,
        },
        {
          id: "t2",
          description: "A name is copied out of the inner scope before it ends",
          assertionCode: js`assert(lines.includes("Kept after the scratch note was dropped: Nova"), 'No line is exactly "Kept after the scratch note was dropped: Nova". Inside the { } block pick the brighter of line_arcturus and the scratch note, copy its name with field(pick, 0).to_string() into kept_name, and print kept_name after the block.');`,
        },
        {
          id: "t3",
          description: "The observatory receives the lifetime demo",
          assertionCode: js`
const d = scene.lifetimeDemo;
assert(d && typeof d === "object", 'Send the demo with scene("lifetimeDemo", Json::new()...);');
assertEqual(d.first, "Vega", "first should be the name of line_vega: Vega");
assertEqual(d.second, "Arcturus", "second should be the name of line_arcturus: Arcturus");
assertEqual(d.winner, "Arcturus", "winner should be Arcturus");
assertEqual(d.winnerStart, 76, "winnerStart should be offset_in(&buffer, winner), which is 76 for the Arcturus line (it must be a slice of the buffer, not a copy)");
assertEqual(d.scratch, "Nova", "scratch should be Nova");
assertEqual(d.kept, "Nova", "kept should be the copied name Nova");`,
        },
      ],
      unlocks: ["ob-lifetimes"],
      checks: [
        {
          prompt: "In `fn brighter<'a>(first: &'a str, second: &'a str) -> &'a str`, how long is the returned view guaranteed to be valid?",
          question: {
            type: "choice",
            options: ["For the whole program", "As long as BOTH inputs are alive (the shorter of the two)", "Only as long as `first`", "Until the function returns"],
            answer: 1,
          },
          explanation: "Using one name `'a` on both inputs and on the output ties them together. At each call, `'a` becomes the overlap of the two input lifetimes, so the result cannot outlive the shorter-lived one.",
        },
        {
          prompt: "Which of these does a lifetime annotation do at run time?",
          question: {
            type: "choice",
            options: ["Keeps the data alive longer", "Frees the data earlier", "Nothing: it is checked by the compiler and then erased", "Copies the data"],
            answer: 2,
          },
          explanation: "Lifetimes are a compile-time description. They cannot extend or shorten anything; they only let the compiler verify that no view outlives its owner.",
        },
      ],
    },
    // ───────────────────────── 3 ─────────────────────────
    {
      id: "rust-inventory-3-records",
      title: "Lifetimes 2: records that borrow",
      minutes: 40,
      xp: 150,
      concepts: ["struct Record<'a>", "impl<'a>", "lifetime elision", "&self", "E0106", "E0726", "Option and ?"],
      learn: md`### Structs can hold borrows too

A star record has text fields (name, constellation) and number fields. The text fields are already sitting in the buffer, so the record can simply *hold views* of them instead of owning copies. A struct that holds a reference must declare how long that reference lasts:

~~~rust
#[derive(Debug, Clone)]
struct Record<'a> {
    name: &'a str,
    constellation: &'a str,
    ra_hours: f64,
    dec_deg: f64,
    magnitude: f64,
    distance_ly: u32,
}
~~~

Leave the \`'a\` out and the compiler stops you before you finish typing:

~~~text
error[E0106]: missing lifetime specifier
 --> main.rs:3:11
  |
3 |     name: &str,
  |           ^ expected named lifetime parameter
help: consider introducing a named lifetime parameter
  |
2 ~ struct Record<'a> {
3 ~     name: &'a str,
~~~

\`Record<'a>\` reads "a Record that borrows from some text valid for \`'a\`". **A Record can never outlive the buffer it was cut from**, and the compiler enforces it everywhere the record is used. The numbers (\`f64\`, \`u32\`) are parsed copies and have no lifetime at all.

### The impl block repeats the parameter

~~~rust
impl<'a> Record<'a> {
    fn from_line(line: &'a str) -> Option<Record<'a>> {
        let mut parts = line.split('|');
        let name = parts.next()?.trim();
        let constellation = parts.next()?.trim();
        let ra_hours = parts.next()?.trim().parse().ok()?;
        let dec_deg = parts.next()?.trim().parse().ok()?;
        let magnitude = parts.next()?.trim().parse().ok()?;
        let distance_ly = parts.next()?.trim().parse().ok()?;
        Some(Record { name, constellation, ra_hours, dec_deg, magnitude, distance_ly })
    }
}
~~~

\`impl<'a>\` introduces the name, \`Record<'a>\` uses it, and \`from_line(line: &'a str)\` says the record is built from a line that lasts as long as the record's borrow. If you forget the declaration:

~~~text
error[E0726]: implicit elided lifetime not allowed here
 --> main.rs:3:6
  |
3 | impl Record {
  |      ^^^^^^ expected lifetime parameter
help: indicate the anonymous lifetime
  |
3 | impl Record<'_> {
~~~

About the body: \`?\` works on an \`Option\` exactly as it does on a \`Result\` (Reef Station used it that way). The first missing piece makes \`from_line\` return \`None\` straight away. And \`.parse().ok()?\` has no turbofish because the type is decided later, where the value lands in a field: \`f64\` for the three floats and \`u32\` for the distance. This sketch only says *whether* a line parsed. Lesson 5 will teach it to say *why not*.

### The elision rules, so you can stop writing most lifetimes

Often you do not write lifetimes at all, and the same signature compiles. The compiler fills them in when the situation is unambiguous. Three rules, applied in order:

1. Every elided reference in the **inputs** gets its own fresh lifetime.
2. If there is **exactly one** input lifetime, the output gets that one. So \`fn first_word(s: &str) -> &str\` means \`fn first_word<'a>(s: &'a str) -> &'a str\`.
3. If one of the inputs is \`&self\` or \`&mut self\`, the output gets *its* lifetime.

The classic gap is two inputs and no \`self\`. That is lesson 2's \`brighter\`: rule 2 does not apply, so you must write it. Here is a trap that catches almost everyone once:

~~~rust
fn first_name(list: &[Record]) -> &str { /* ... */ }
~~~

One parameter, so rule 2 should work? It does not, because \`&[Record]\` secretly contains **two** lifetimes: the one on the slice reference and the hidden one inside \`Record<'_>\`:

~~~text
error[E0106]: missing lifetime specifier
 --> main.rs:3:35
  |
3 | fn first_name(list: &[Record]) -> &str {
  |                     ---------     ^ expected named lifetime parameter
  = help: this function's return type contains a borrowed value, but the signature does not say which one of \`list\`'s 2 lifetimes it is borrowed from
~~~

Say which one you mean. The name text lives in the buffer, which is the inner lifetime:

~~~rust
fn first_name<'a>(list: &[Record<'a>]) -> &'a str {
    list.first().map(|record| record.name).unwrap_or("")
}
~~~

### Rule 3 and a lifetime that matters

Methods use rule 3, and it hides a choice. Compare two ways of writing the getter:

~~~rust
fn name(&self) -> &str { self.name }     // elided: tied to the borrow of the Record
fn name(&self) -> &'a str { self.name }  // tied to the BUFFER, which lasts longer
~~~

The first compiles, but it promises less: the returned view is only valid while the *record* is borrowed. Use it after the record is gone and you get E0597 even though the text is still in the buffer:

~~~text
error[E0597]: \`rec\` does not live long enough
  --> main.rs:11:16
   |
10 |         let rec = Record { name: &buffer };
   |             --- binding \`rec\` declared here
11 |         kept = rec.name();
   |                ^^^ borrowed value does not live long enough
12 |     }
   |     - \`rec\` dropped here while still borrowed
~~~

Writing \`-> &'a str\` promises more (the text outlives the record) and the body can keep it, because it really does. This lesson's \`name()\` uses it, and the code proves it by keeping a name after its record is dropped.

### A record cannot be changed behind the buffer's back

While any \`Record\` is alive the buffer is borrowed, so growing or clearing it is refused:

~~~text
error[E0502]: cannot borrow \`buffer\` as mutable because it is also borrowed as immutable
 --> main.rs:6:5
  |
5 |     let rec = Record { name: &buffer[0..4] };
  |                               ------ immutable borrow occurs here
6 |     buffer.clear();
  |     ^^^^^^^^^^^^^^ mutable borrow occurs here
7 |     println!("{}", rec.name);
  |                    -------- immutable borrow later used here
~~~

That is a feature: clearing the buffer would leave \`rec.name\` pointing at nothing. It is also the reason a parser that returns borrowing records must keep the input text alive until it has finished with them.

### Common mistakes

- Putting \`Record<'a>\` in an \`impl\` without declaring \`impl<'a>\`.
- Writing \`fn name(&self) -> &str\` and then wondering why the name cannot outlive the record.
- Making the struct own a \`String\` per field "to avoid lifetimes". That works and is sometimes right, but it copies every field of every record.
- Reading E0597 as "the compiler is wrong". Find the three places it points at.`,
      mission: md`Time to give the importer its data type. A **Record** is one star: name, constellation, right ascension in hours, declination in degrees, magnitude and distance in light years. It must not copy the text of the log. It *borrows* the name and the constellation straight out of the buffer, and the observatory will draw an arrow from each borrowed field back to its exact bytes.

Build the struct, a \`from_line\` constructor that gives \`None\` for a bad line, and a card method that reports where each borrowed field sits. Then parse the whole sample and prove a name can outlive its record.`,
      tasks: [
        "Above the divider declare #[derive(Debug, Clone)] struct Record<'a> with name and constellation as &'a str, ra_hours, dec_deg and magnitude as f64, and distance_ly as u32",
        "Add impl<'a> Record<'a> with fn from_line(line: &'a str) -> Option<Record<'a>> (split on '|', ? for each missing piece, trim each field, .parse().ok()? for the four numbers); fn name(&self) -> &'a str; and fn scene_card(&self, whole: &str) -> Json with name, constellation, ra, dec, mag, dist plus nameStart and conStart (offset_in(whole, ...))",
        "Write fn first_name<'a>(list: &[Record<'a>]) -> &'a str returning the first record's name or \"\"",
        "In main: let records: Vec<Record> = buffer.lines().filter_map(Record::from_line).collect(); then print one line per record in the form Sirius in Canis Major: mag -1.46, 9 ly",
        "Declare let borrowed_name: &str; and in an inner block create short_lived from first_line with from_line(...).unwrap() and assign borrowed_name = short_lived.name(); after the block print The name outlived its record: Sirius, then First name in the list: Sirius from first_name(&records)",
        "Send scene records: records.iter().map(|record| record.scene_card(&buffer)).collect::<Vec<Json>>()",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: records that borrow. Write these in this part of the file (above main):
// #[derive(Debug, Clone)]  struct Record<'a> { name: &'a str, constellation: &'a str, ra_hours: f64, dec_deg: f64, magnitude: f64, distance_ly: u32 }
// impl<'a> Record<'a> {
//     fn from_line(line: &'a str) -> Option<Record<'a>>      split('|'), next()? and trim() the two names, .trim().parse().ok()? the four numbers
//     fn name(&self) -> &'a str                              return the name with the long lifetime
//     fn scene_card(&self, whole: &str) -> Json              name, constellation, ra, dec, mag, dist, nameStart, conStart (offset_in(whole, ..))
// }
// fn first_name<'a>(list: &[Record<'a>]) -> &'a str
${MAIN_DIVIDER}
// let records: Vec<Record> = buffer.lines().filter_map(Record::from_line).collect();
// for each record print:  Sirius in Canis Major: mag -1.46, 9 ly
// let borrowed_name: &str;   { let short_lived = Record::from_line(first_line).unwrap();  borrowed_name = short_lived.name(); }
// print:  The name outlived its record: Sirius      then:  First name in the list: Sirius
// scene("records", records.iter().map(|record| record.scene_card(&buffer)).collect::<Vec<Json>>());
`,
      solutionAdd: rs`#[derive(Debug, Clone)]
struct Record<'a> {
    name: &'a str,
    constellation: &'a str,
    ra_hours: f64,
    dec_deg: f64,
    magnitude: f64,
    distance_ly: u32,
}

impl<'a> Record<'a> {
    fn from_line(line: &'a str) -> Option<Record<'a>> {
        let mut parts = line.split('|');
        let name = parts.next()?.trim();
        let constellation = parts.next()?.trim();
        let ra_hours = parts.next()?.trim().parse().ok()?;
        let dec_deg = parts.next()?.trim().parse().ok()?;
        let magnitude = parts.next()?.trim().parse().ok()?;
        let distance_ly = parts.next()?.trim().parse().ok()?;
        Some(Record { name, constellation, ra_hours, dec_deg, magnitude, distance_ly })
    }

    fn name(&self) -> &'a str {
        self.name
    }

    fn scene_card(&self, whole: &str) -> Json {
        Json::new()
            .with("name", self.name)
            .with("constellation", self.constellation)
            .with("ra", self.ra_hours)
            .with("dec", self.dec_deg)
            .with("mag", self.magnitude)
            .with("dist", self.distance_ly)
            .with("nameStart", offset_in(whole, self.name))
            .with("conStart", offset_in(whole, self.constellation))
    }
}

fn first_name<'a>(list: &[Record<'a>]) -> &'a str {
    list.first().map(|record| record.name).unwrap_or("")
}
${MAIN_DIVIDER}
// Lesson 3: records that borrow.
let records: Vec<Record> = buffer.lines().filter_map(Record::from_line).collect();
for record in &records {
    println!("{} in {}: mag {}, {} ly", record.name, record.constellation, record.magnitude, record.distance_ly);
}

let borrowed_name: &str;
{
    let short_lived = Record::from_line(first_line).unwrap();
    borrowed_name = short_lived.name();
}
println!("The name outlived its record: {borrowed_name}");
println!("First name in the list: {}", first_name(&records));

scene("records", records.iter().map(|record| record.scene_card(&buffer)).collect::<Vec<Json>>());`,
      explanation:
        "Record<'a> holds two &'a str fields that point into the buffer, so every Record is tied to the buffer's lifetime, while the numbers are parsed copies. from_line takes &'a str and returns a Record<'a>, and the ? operator turns any missing or unparsable piece into None. Because name() is declared to return &'a str (not an elided &str tied to &self), the returned name stays valid after short_lived is dropped, as long as the buffer is alive.",
      hints: [
        { id: "h1", title: "The struct and the impl header", content: "struct Record<'a> { name: &'a str, constellation: &'a str, ra_hours: f64, dec_deg: f64, magnitude: f64, distance_ly: u32 } and then impl<'a> Record<'a> { ... } so the methods can use the same 'a. Put #[derive(Debug, Clone)] on the line above the struct." },
        { id: "h2", title: "from_line", content: "let mut parts = line.split('|'); let name = parts.next()?.trim(); let constellation = parts.next()?.trim(); let ra_hours = parts.next()?.trim().parse().ok()?; and the same for dec_deg, magnitude and distance_ly; end with Some(Record { name, constellation, ra_hours, dec_deg, magnitude, distance_ly })." },
        { id: "h3", title: "The long-lived name", content: "fn name(&self) -> &'a str { self.name } Writing 'a here (not a bare &str) is what lets borrowed_name survive after short_lived is dropped. For the card use Json::new().with(\"name\", self.name).with(\"nameStart\", offset_in(whole, self.name)) and so on for the other fields." },
      ],
      tests: [
        {
          id: "t1",
          description: "Each star is parsed into a record",
          assertionCode: js`
const want = ["Sirius in Canis Major: mag -1.46, 9 ly", "Canopus in Carina: mag -0.74, 310 ly", "Arcturus in Bootes: mag -0.05, 37 ly", "Vega in Lyra: mag 0.03, 25 ly", "Rigel in Orion: mag 0.13, 860 ly", "Altair in Aquila: mag 0.76, 17 ly"];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + '. Print one line per record: println!("{} in {}: mag {}, {} ly", record.name, record.constellation, record.magnitude, record.distance_ly);');`,
        },
        {
          id: "t2",
          description: "A name outlives its record because name() returns &'a str",
          assertionCode: js`
assert(lines.includes("The name outlived its record: Sirius"), 'No line is exactly "The name outlived its record: Sirius". Make short_lived inside an inner block, assign borrowed_name = short_lived.name(), and print it after the block. name() must return &\'a str.');
assert(lines.includes("First name in the list: Sirius"), 'No line is exactly "First name in the list: Sirius". Write first_name<\'a>(list: &[Record<\'a>]) -> &\'a str and print first_name(&records).');`,
        },
        {
          id: "t3",
          description: "The observatory receives records with their positions in the buffer",
          assertionCode: js`
const r = scene.records;
assert(Array.isArray(r) && r.length === 6, 'Send scene("records", ...) with one card per star (6 of them).');
assertEqual(r[0].name, "Sirius", "The first card should be Sirius");
assertEqual(r[0].constellation, "Canis Major", "The first card's constellation should be Canis Major");
assertEqual(r[0].ra, 6.75, "ra should be the parsed right ascension 6.75");
assertEqual(r[0].mag, -1.46, "mag should be the parsed magnitude -1.46");
assertEqual(r[0].dist, 9, "dist should be the parsed distance 9");
assertEqual(r[0].nameStart, 0, "nameStart should be offset_in(whole, self.name), which is 0 for Sirius");
assertEqual(r[0].conStart, 7, "conStart should be 7 for Sirius (its constellation starts at byte 7)");
assertEqual(r[2].nameStart, 76, "Arcturus starts at byte 76 of the buffer: nameStart must come from offset_in(whole, self.name), proving the name is a borrowed slice");`,
        },
      ],
      unlocks: ["ob-records"],
      checks: [
        {
          prompt: "What does `Record<'a>` tell the compiler?",
          question: {
            type: "choice",
            options: ["The record is stored in static memory", "The record borrows text that must stay valid for `'a`, so it cannot outlive that text", "The record has a lifetime of 1 second", "The record is always copied"],
            answer: 1,
          },
          explanation: "The `'a` on the struct names the lifetime of the borrowed fields. Every use of a `Record` is checked against it, so a record can never point into text that has been freed or changed.",
        },
        {
          prompt: "`fn first_name(list: &[Record]) -> &str` fails with E0106 but `fn first_word(s: &str) -> &str` compiles. Why?",
          question: {
            type: "choice",
            options: ["Slices are not allowed", "`&[Record]` hides two lifetimes (the slice's and the Record's), so elision cannot choose one", "`Record` has no methods", "`first_word` returns a String"],
            answer: 1,
          },
          explanation: "Elision only fills in the output when there is exactly one input lifetime (or a `&self`). `&[Record]` has two, so you must name which one the result borrows from.",
        },
      ],
    },
    // ───────────────────────── 4 ─────────────────────────
    {
      id: "rust-inventory-4-modules",
      title: "Modules: a map for your code",
      minutes: 40,
      xp: 150,
      concepts: ["mod", "pub", "use", "self::", "super::", "crate::", "privacy", "module_path!", "files and mod"],
      learn: md`### One file now, many files later

Everything so far lives at the top of one file. A real crate splits code into **modules**, each with its own name and its own privacy. A module is just a named container for functions, types and constants:

~~~rust
mod rules {
    pub const MAX_RA_HOURS: f64 = 24.0;

    pub fn ra_ok(hours: f64) -> bool {
        hours >= 0.0 && hours < MAX_RA_HOURS
    }
}

fn main() {
    println!("{}", rules::ra_ok(25.14));      // false: a path walks into the module with ::
}
~~~

Here the module is written **inline**, between braces, because this course keeps one file. In a crate the same module lives in a file. These two layouts describe the same tree:

~~~text
one file                       a crate on disk
main.rs                        src/main.rs         // contains:  mod rules;  mod sky;
  mod rules { ... }            src/rules.rs        // the body of "mod rules"
  mod sky {                    src/sky.rs          // contains:  pub mod coords;  pub mod light;
    pub mod coords { ... }     src/sky/coords.rs
    pub mod light { ... }      src/sky/light.rs
  }
~~~

\`mod rules;\` with a semicolon means "load this module from the file \`rules.rs\`". The module tree is the same either way; only where the text lives changes. The name of the crate root, and the root of every path, is \`crate\`.

### Privacy: everything is private by default

Items inside a module are hidden from the outside unless marked \`pub\`:

~~~rust
mod catalog {
    fn parse(line: &str) -> usize { line.len() }              // private
    pub fn count(line: &str) -> usize { parse(line) }          // public, and may use the private one
}

fn main() {
    catalog::count("abc");      // fine
    catalog::parse("abc");      // not allowed
}
~~~

~~~text
error[E0603]: function \`parse\` is private
 --> main.rs:6:63
  |
6 | fn main() { println!("{} {}", catalog::count("abc"), catalog::parse("abc")); }
  |                                                               ^^^^^ private function
note: the function \`parse\` is defined here
 --> main.rs:3:5
~~~

The rule: **an item is visible inside the module that defines it and inside that module's children.** \`pub\` extends that to the module's parents and everyone else. Struct fields have their own switch: a \`pub struct\` with a private field cannot be built or read field by field from outside (E0616, *field \`name\` of struct \`Star\` is private*), which is how a module forces callers through its constructor.

### Paths: self, super, crate

~~~rust
mod sky {
    pub mod coords {
        pub fn hours_to_degrees(hours: f64) -> f64 { hours * 15.0 }
    }

    pub mod light {
        const NAKED_EYE_LIMIT: f64 = 6.0;                              // private to light

        pub fn naked_eye(magnitude: f64) -> bool {
            magnitude <= self::NAKED_EYE_LIMIT                          // self: this module
        }
        pub fn bearing_for(hours: f64) -> f64 {
            super::coords::hours_to_degrees(hours)                      // super: the parent (sky)
        }
    }
}
~~~

- \`self::\` starts at the module you are in.
- \`super::\` starts at its parent. Chain them (\`super::super::\`) to climb further.
- \`crate::\` starts at the root, so \`crate::sky::coords::hours_to_degrees\` works from anywhere.
- A path with no prefix is looked up from the current module, or from something you imported.

A wrong path gives you one of these, and each one names the real problem:

~~~text
error[E0425]: cannot find function \`count\` in this scope        // you forgot the module name
help: consider importing this function
error[E0433]: cannot find module or crate \`report\` in this scope   // that module does not exist
error[E0432]: unresolved import \`catalog::counts\`                  // a typo in a use line
help: a similar name exists in the module
~~~

### \`use\` shortens a path

~~~rust
use sky::coords::hours_to_degrees;       // now the short name works in this module
let degrees = hours_to_degrees(6.75);
~~~

\`use\` does not move or copy anything. It only creates a short name in the current scope. The usual style is to import the *parent module* for functions (\`use sky::coords;\` then \`coords::hours_to_degrees(..)\`) so the origin stays visible at the call, and to import the item itself for types and traits.

### Asking a module where it lives

The macro \`module_path!()\` expands to the full path of the module it is written in, as text. It makes a small, honest way to draw the tree your code really has. In a crate named \`app\`, a function in \`sky::light\` would answer \`app::sky::light\`; with this file, the root is called \`main\`.

### Common mistakes

- Marking a function \`pub\` but not the module it sits in (\`mod sky { pub mod coords ...\`, both need \`pub\` to be reached from outside).
- Forgetting that a child module does **not** automatically see its parent's names; it needs \`super::\` or \`use super::*;\`.
- Reopening a module: you cannot write \`mod rules {}\` twice; one module has one body.
- Making everything \`pub\` "to be safe". Privacy is how a module protects its own rules.`,
      mission: md`The importer is growing too many loose functions. The observatory's data rules (what counts as a valid right ascension or magnitude) and its sky maths (hours to degrees, brightness bands) deserve their own corners with clear names, and some of their details should stay private.

Build the module tree, call into it with different path styles, and let each module report its own address with \`module_path!()\`. The **Module map** draws your tree and lets you click a module to see what \`self::\`, \`super::\` and \`crate::\` mean from there.`,
      tasks: [
        "Above the divider create mod rules with pub const MAX_RA_HOURS: f64 = 24.0; pub fn ra_ok(hours: f64) -> bool (0 up to but not including 24); pub fn dec_ok(degrees: f64) -> bool (absolute value at most 90); pub fn mag_ok(magnitude: f64) -> bool (-30 to 30 inclusive); pub fn here() -> &'static str returning module_path!()",
        "Create mod sky containing pub mod coords (pub fn hours_to_degrees(hours: f64) -> f64 that multiplies by 15.0, and pub fn here()) and pub mod light with a PRIVATE const NAKED_EYE_LIMIT: f64 = 6.0, pub fn band(magnitude: f64) -> &'static str (below 0.5 brilliant, below 1.5 bright, otherwise dim), pub fn naked_eye using self::NAKED_EYE_LIMIT, pub fn bearing_for(hours) calling super::coords::hours_to_degrees, and pub fn here(); sky itself also has pub fn here()",
        "Add use sky::coords::hours_to_degrees; and in main print Sirius: RA 6.75 h = 101.25 degrees (use {sirius_degrees:.2}), Sirius band: brilliant, RA 25.14 h valid: false, A magnitude 7.1 star is visible to the naked eye: false and Bearing for Vega via super: 279.3 (one decimal)",
        "Collect let module_paths = vec![rules::here(), sky::here(), sky::coords::here(), sky::light::here()]; and print Modules: followed by the four paths joined with \", \"",
        "Send scene modules (&module_paths) and moduleChecks: a Vec<String> of four format! lines such as rules::ra_ok(25.14) = false, sky::light::band(-1.46) = brilliant, sky::light::naked_eye(7.1) = false and sky::light::bearing_for(18.62) = 279.3",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: modules. Write these in this part of the file (above main):
// mod rules { pub const MAX_RA_HOURS; pub fn ra_ok(hours) -> bool; pub fn dec_ok(degrees) -> bool; pub fn mag_ok(magnitude) -> bool; pub fn here() -> &'static str { module_path!() } }
// mod sky {
//     pub mod coords { pub fn hours_to_degrees(hours: f64) -> f64;  pub fn here() }
//     pub mod light  { const NAKED_EYE_LIMIT: f64 = 6.0 (private);  pub fn band(magnitude) -> &'static str;  pub fn naked_eye(magnitude) -> bool;
//                      pub fn bearing_for(hours) -> f64 (use super::coords::...);  pub fn here() }
//     pub fn here()
// }
// use sky::coords::hours_to_degrees;
${MAIN_DIVIDER}
// print:  Sirius: RA 6.75 h = 101.25 degrees      Sirius band: brilliant      RA 25.14 h valid: false
//         A magnitude 7.1 star is visible to the naked eye: false      Bearing for Vega via super: 279.3
// let module_paths = vec![rules::here(), sky::here(), sky::coords::here(), sky::light::here()];     print:  Modules: main::rules, main::sky, ...
// scene("modules", &module_paths);    scene("moduleChecks", vec![format!("rules::ra_ok(25.14) = {}", rules::ra_ok(25.14)), ...four lines]);
`,
      solutionAdd: rs`mod rules {
    pub const MAX_RA_HOURS: f64 = 24.0;

    pub fn ra_ok(hours: f64) -> bool {
        hours >= 0.0 && hours < MAX_RA_HOURS
    }

    pub fn dec_ok(degrees: f64) -> bool {
        degrees.abs() <= 90.0
    }

    pub fn mag_ok(magnitude: f64) -> bool {
        magnitude >= -30.0 && magnitude <= 30.0
    }

    pub fn here() -> &'static str {
        module_path!()
    }
}

mod sky {
    pub mod coords {
        pub fn hours_to_degrees(hours: f64) -> f64 {
            hours * 15.0
        }

        pub fn here() -> &'static str {
            module_path!()
        }
    }

    pub mod light {
        const NAKED_EYE_LIMIT: f64 = 6.0;

        pub fn band(magnitude: f64) -> &'static str {
            if magnitude < 0.5 {
                "brilliant"
            } else if magnitude < 1.5 {
                "bright"
            } else {
                "dim"
            }
        }

        pub fn naked_eye(magnitude: f64) -> bool {
            magnitude <= self::NAKED_EYE_LIMIT
        }

        pub fn bearing_for(hours: f64) -> f64 {
            super::coords::hours_to_degrees(hours)
        }

        pub fn here() -> &'static str {
            module_path!()
        }
    }

    pub fn here() -> &'static str {
        module_path!()
    }
}

use sky::coords::hours_to_degrees;
${MAIN_DIVIDER}
// Lesson 4: modules.
let sirius_degrees = hours_to_degrees(6.75);
println!("Sirius: RA 6.75 h = {sirius_degrees:.2} degrees");
println!("Sirius band: {}", sky::light::band(-1.46));
println!("RA 25.14 h valid: {}", rules::ra_ok(25.14));
println!("A magnitude 7.1 star is visible to the naked eye: {}", sky::light::naked_eye(7.1));
println!("Bearing for Vega via super: {:.1}", sky::light::bearing_for(18.62));

let module_paths = vec![rules::here(), sky::here(), sky::coords::here(), sky::light::here()];
println!("Modules: {}", module_paths.join(", "));

scene("modules", &module_paths);
scene(
    "moduleChecks",
    vec![
        format!("rules::ra_ok(25.14) = {}", rules::ra_ok(25.14)),
        format!("sky::light::band(-1.46) = {}", sky::light::band(-1.46)),
        format!("sky::light::naked_eye(7.1) = {}", sky::light::naked_eye(7.1)),
        format!("sky::light::bearing_for(18.62) = {:.1}", sky::light::bearing_for(18.62)),
    ],
);`,
      explanation:
        "Each module is a named container whose items are private unless marked pub. naked_eye reaches its own private constant with self::, bearing_for climbs to the parent with super::, and a use line gives hours_to_degrees a short name in main. module_path!() expands to the module the macro sits in, so the four here() functions report main::rules, main::sky, main::sky::coords and main::sky::light, which is exactly the tree the observatory draws.",
      hints: [
        { id: "h1", title: "The shape of the tree", content: "mod rules { ... } and mod sky { pub mod coords { ... } pub mod light { ... } pub fn here() -> &'static str { module_path!() } } are two separate top-level items above main. Everything the outside world calls needs pub, including the inner modules coords and light." },
        { id: "h2", title: "self and super", content: "Inside light: const NAKED_EYE_LIMIT: f64 = 6.0; (no pub) and pub fn naked_eye(magnitude: f64) -> bool { magnitude <= self::NAKED_EYE_LIMIT } and pub fn bearing_for(hours: f64) -> f64 { super::coords::hours_to_degrees(hours) }" },
        { id: "h3", title: "Printing and sending", content: "let module_paths = vec![rules::here(), sky::here(), sky::coords::here(), sky::light::here()]; println!(\"Modules: {}\", module_paths.join(\", \")); scene(\"modules\", &module_paths); For moduleChecks, vec![format!(\"rules::ra_ok(25.14) = {}\", rules::ra_ok(25.14)), format!(\"sky::light::band(-1.46) = {}\", sky::light::band(-1.46)), ...]" },
      ],
      tests: [
        {
          id: "t1",
          description: "The module functions give the right answers",
          assertionCode: js`
const want = ["Sirius: RA 6.75 h = 101.25 degrees", "Sirius band: brilliant", "RA 25.14 h valid: false", "A magnitude 7.1 star is visible to the naked eye: false", "Bearing for Vega via super: 279.3"];
const missing = want.filter((w) => !lines.includes(w));
assert(missing.length === 0, "These lines are missing: " + missing.join(" | ") + ". Check the function in each module: hours_to_degrees multiplies by 15, band uses 0.5 and 1.5 as limits, naked_eye compares with 6.0.");`,
        },
        {
          id: "t2",
          description: "Each module reports its own path with module_path!()",
          assertionCode: js`assert(lines.includes("Modules: main::rules, main::sky, main::sky::coords, main::sky::light"), 'No line is exactly "Modules: main::rules, main::sky, main::sky::coords, main::sky::light". Give each of the four modules a pub fn here() -> &\'static str { module_path!() } and join the four answers with ", ".');`,
        },
        {
          id: "t3",
          description: "The observatory receives the module map",
          assertionCode: js`
assert(Array.isArray(scene.modules) && scene.modules.join(",") === "main::rules,main::sky,main::sky::coords,main::sky::light", 'Send scene("modules", &module_paths); with the four module paths in that order.');
const c = scene.moduleChecks;
assert(Array.isArray(c) && c.length === 4, "moduleChecks should hold four strings.");
assertEqual(c[0], "rules::ra_ok(25.14) = false", "First moduleChecks entry");
assertEqual(c[1], "sky::light::band(-1.46) = brilliant", "Second moduleChecks entry");
assertEqual(c[2], "sky::light::naked_eye(7.1) = false", "Third moduleChecks entry");
assertEqual(c[3], "sky::light::bearing_for(18.62) = 279.3", "Fourth moduleChecks entry");`,
        },
      ],
      unlocks: ["ob-modules"],
      checks: [
        {
          prompt: "A function inside `mod light` is declared without `pub`. Who can call it?",
          question: {
            type: "choice",
            options: ["Anyone in the crate", "Only code inside `light` (and the modules nested in it)", "Only `main`", "Nobody, not even `light`"],
            answer: 1,
          },
          explanation: "Private means visible in the module that defines the item and in its children. Anything outside gets E0603 (function is private).",
        },
        {
          prompt: "From inside `sky::light`, what does `super::coords::hours_to_degrees(h)` refer to?",
          question: {
            type: "choice",
            options: ["A function in `light`", "A function in `sky::coords`, reached through the parent module `sky`", "A function in the crate root", "A function in a different crate"],
            answer: 1,
          },
          explanation: "`super` means the parent module. The parent of `sky::light` is `sky`, and `sky::coords` is its sibling, so the path lands on `sky::coords::hours_to_degrees`.",
        },
        {
          prompt: "What does `mod rules;` (with a semicolon) mean in a real crate?",
          question: {
            type: "choice",
            options: ["Declare an empty module", "Load the module's body from a file named `rules.rs`", "Import everything from the crate `rules`", "Make `rules` public"],
            answer: 1,
          },
          explanation: "The semicolon form tells the compiler to read the module body from `rules.rs` (or `rules/mod.rs`). The inline `mod rules { ... }` form used in this course is the same module with the text written in place.",
        },
      ],
    },
  ],
};
