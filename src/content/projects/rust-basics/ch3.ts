import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 3: Owning your data. Vec, then the ideas that make Rust different: ownership and
 * borrowing, and finally the two string types, which are ownership and borrowing in disguise.
 *
 * Lessons 9 to 11 add functions above main (before MAIN_DIVIDER) and statements below it.
 */

export const chapter3: Chapter = {
  id: "owning-your-data",
  title: "Owning your data",
  blurb: "Growable lists, then the idea that makes Rust different: who owns a value, and who may borrow it.",
  lessons: [
    // ───────────────────────── 8 ─────────────────────────
    {
      id: "rust-basics-8-vec",
      title: "Vec: a growable list",
      minutes: 35,
      xp: 120,
      concepts: ["Vec<T>", "vec!", "push", "len", "indexing", "get", "iter", "sort", "references in loops", "panics"],
      learn: md`### Arrays are fixed, a \`Vec\` grows

An array has its length baked into its type. A dive log that gets a new entry after every dive cannot live in one. For that Rust gives you \`Vec<T>\` (say "vec" or "vector"): a growable list of values that all have the same type \`T\`. It is the collection you will use most.

~~~rust
let mut dive_log = vec![18, 25, 31, 12];     // the vec! macro: a Vec<i32> with four items
dive_log.push(35);                           // add to the end: [18, 25, 31, 12, 35]
println!("{} dives", dive_log.len());        // 5
~~~

\`vec![...]\` builds one from values. \`Vec::new()\` builds an empty one, and then the compiler has to learn the element type from somewhere: from the first \`push\`, or from an annotation, \`let mut v: Vec<i32> = Vec::new();\`. Otherwise you get error[E0282]: type annotations needed for \`Vec<_>\`.

Changing a Vec requires \`mut\`, exactly like any variable. The items live in a block of memory on the **heap**, and the Vec itself (a pointer, a length and a capacity) is a small value on the stack. When the block is full, a push allocates a bigger one and moves the items across. You do not manage that, and you will see in lesson 10 that Rust makes sure nobody is still pointing at the old block.

### The everyday methods

~~~rust
dive_log.len()            // how many items (a usize)
dive_log.is_empty()       // true when len() == 0
dive_log.push(28)         // add at the end
dive_log.pop()            // remove the last one: returns Option<i32>
dive_log.insert(1, 99)    // add at position 1, shifting the rest up
dive_log.remove(0)        // remove at position 0 and return it, shifting the rest down
dive_log.contains(&25)    // is there a 25? (note the &)
dive_log.sort()           // sort in place, smallest first
dive_log.reverse()        // reverse in place
dive_log.first()          // Option<&i32>
dive_log.last()           // Option<&i32>
dive_log.clear()          // remove everything
~~~

### Indexing, and the safe alternative

\`dive_log[2]\` reads the third item. Like arrays, an index outside the list **panics**: *index out of bounds: the len is 5 but the index is 9*. That is correct behaviour for a bug, but not for a question such as "is there a dive number 8?", where the honest answer might be "no". For questions, use **\`get\`**. It returns an \`Option\`: either \`Some(value)\` or \`None\`.

~~~rust
println!("{:?}", dive_log.get(1));      // Some(25)
println!("{:?}", dive_log.get(9));      // None

match dive_log.get(7) {
    Some(depth) => println!("Dive #8 went to {depth} m"),
    None => println!("No dive #8 in the log yet"),
}
~~~

\`Option\` is the subject of lesson 14. For now it is another enum for \`match\` to take apart: \`Some\` holds the answer, \`None\` means "nothing there". The big idea: where other languages would return a null or a magic number like -1, Rust's type says "this might be missing" and you must handle it.

### Looping over a Vec

~~~rust
let mut deepest = dive_log[0];
for depth in dive_log.iter() {
    if *depth > deepest {
        deepest = *depth;
    }
}
~~~

\`.iter()\` visits the items **by reference**: each \`depth\` is a \`&i32\`, a *reference to* the number that stays inside the Vec. To compare or copy the number itself you **dereference** it with a leading \`*\`. Printing and many methods do this for you automatically, which is why \`println!("{depth}")\` prints the number without any star. (When you write \`for depth in dive_log\` with no \`.iter()\`, the loop takes the whole Vec away. Lesson 9 explains why that matters, and \`for depth in &dive_log\` is the borrowing form.)

### Common mistakes

- Using \`dive_log[i]\` for a question that can fail. Use \`get\`.
- Index of the wrong type: the index must be a \`usize\`. A variable of type \`i32\` needs \`as usize\` (otherwise E0277: the type \`[i32]\` cannot be indexed by \`i32\`).
- Pushing the wrong type: a Vec of \`i32\` will not take \`"deep"\` (E0308).
- Forgetting \`mut\`: error[E0596]: cannot borrow \`dive_log\` as mutable, as it is not declared as mutable.
- Comparing \`*depth\` with \`depth\`: \`if depth > deepest\` is a mismatched types error (\`&i32\` vs \`i32\`).
- Adding to the Vec while looping over it. The compiler stops that (E0502), and lesson 10 explains the reason.`,
      mission: md`Every dive that leaves the airlock is written in the dive log. The log grows during the shift, the divemaster asks "what was the deepest one?" and "what was dive number 8?", and the log has to be kept in depth order for the weekly report.

You will build the log from four earlier dives plus the planned one, search it, look up entries safely, and sort it. When this lesson passes, the **Dive log** lights up with the entries as bars.`,
      tasks: [
        "Create let mut dive_log = vec![18, 25, 31, 12]; and push planned_depth onto it. Store dive_log.len() in dive_count",
        "Find the deepest dive with a for loop over dive_log.iter() (remember to dereference with *depth). Print 5 dives logged, deepest 35 m",
        "Print Dive #2 is Some(25) using dive_log.get(1) and {:?}",
        "Use match on dive_log.get(7): the Some arm prints Dive #8 went to {depth} m, the None arm prints No dive #8 in the log yet",
        "Sort the log with dive_log.sort(); take shallowest = dive_log[0]; print Log in depth order: [12, 18, 25, 31, 35] (shallowest 12 m)",
        "Send diveLog (&dive_log), diveCount, deepest and shallowest to the board",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: the dive log.
// 1. let mut dive_log = vec![18, 25, 31, 12];   dive_log.push(planned_depth);   let dive_count = dive_log.len();
// 2. let mut deepest = dive_log[0];  for depth in dive_log.iter() { if *depth > deepest { deepest = *depth; } }
//    println!("{dive_count} dives logged, deepest {deepest} m");
// 3. println!("Dive #2 is {:?}", dive_log.get(1));
// 4. match dive_log.get(7) { Some(depth) => println!("Dive #8 went to {depth} m"), None => println!("No dive #8 in the log yet") }
// 5. dive_log.sort();  let shallowest = dive_log[0];
//    println!("Log in depth order: {:?} (shallowest {shallowest} m)", dive_log);
// scene keys: diveLog, diveCount, deepest, shallowest      (lend the Vec with &, like &dive_log)
`,
      solutionAdd: rs`// Lesson 8: the dive log.
let mut dive_log = vec![18, 25, 31, 12];
dive_log.push(planned_depth);
let dive_count = dive_log.len();

let mut deepest = dive_log[0];
for depth in dive_log.iter() {
    if *depth > deepest {
        deepest = *depth;
    }
}
println!("{dive_count} dives logged, deepest {deepest} m");

println!("Dive #2 is {:?}", dive_log.get(1));
match dive_log.get(7) {
    Some(depth) => println!("Dive #8 went to {depth} m"),
    None => println!("No dive #8 in the log yet"),
}

dive_log.sort();
let shallowest = dive_log[0];
println!("Log in depth order: {:?} (shallowest {shallowest} m)", dive_log);

scene("diveLog", &dive_log);
scene("diveCount", dive_count);
scene("deepest", deepest);
scene("shallowest", shallowest);`,
      explanation:
        "vec! builds a Vec<i32> and push adds the planned depth, so the log has five entries. Iterating with .iter() yields references, so the comparison and the assignment dereference with *depth. get(1) returns Some(25) because index 1 exists, and get(7) returns None, which the match turns into a friendly message instead of a panic. sort() orders the Vec in place, so the first element is now the shallowest. scene takes &dive_log: the & lends the list instead of handing it away.",
      hints: [
        { id: "h1", title: "Building the Vec", content: "let mut dive_log = vec![18, 25, 31, 12]; dive_log.push(planned_depth); let dive_count = dive_log.len(); It needs mut because push changes it." },
        { id: "h2", title: "Deepest with iter()", content: "let mut deepest = dive_log[0]; for depth in dive_log.iter() { if *depth > deepest { deepest = *depth; } } The loop variable is a reference to each item, so put a star in front when you compare or copy it." },
        { id: "h3", title: "get, match and sort", content: "println!(\"Dive #2 is {:?}\", dive_log.get(1)); match dive_log.get(7) { Some(depth) => println!(\"Dive #8 went to {depth} m\"), None => println!(\"No dive #8 in the log yet\") } Then dive_log.sort(); and let shallowest = dive_log[0];" },
      ],
      tests: [
        {
          id: "t1",
          description: "Five dives are logged and the deepest is found",
          assertionCode: js`
assertEqual(scene.diveCount, 5, "diveCount (four dives from vec! plus the pushed planned_depth)");
assertEqual(scene.deepest, 35, "deepest");
assert(lines.includes("5 dives logged, deepest 35 m"), 'Print the line "5 dives logged, deepest 35 m".');`,
        },
        {
          id: "t2",
          description: "get returns Some for a real index",
          assertionCode: js`assert(lines.includes("Dive #2 is Some(25)"), 'Print the line "Dive #2 is Some(25)" using dive_log.get(1) with {:?}. Do this before sorting the log.');`,
        },
        {
          id: "t3",
          description: "get returns None for a missing index, handled with match",
          assertionCode: js`assert(lines.includes("No dive #8 in the log yet"), 'Use match on dive_log.get(7) and print "No dive #8 in the log yet" from the None arm.');`,
        },
        {
          id: "t4",
          description: "The log is sorted in place",
          assertionCode: js`
assertEqual(scene.diveLog, [12, 18, 25, 31, 35], 'diveLog (sort the Vec, then scene("diveLog", &dive_log);)');
assertEqual(scene.shallowest, 12, "shallowest (the first item after sorting)");
assert(lines.includes("Log in depth order: [12, 18, 25, 31, 35] (shallowest 12 m)"), 'Print the line "Log in depth order: [12, 18, 25, 31, 35] (shallowest 12 m)". The Vec is printed with {:?}.');`,
        },
      ],
      unlocks: ["rs-divelog"],
      checks: [
        {
          prompt: "What does `v.get(10)` return when `v` has three items?",
          question: {
            type: "choice",
            options: ["It panics", "`None`", "`0`", "The last item"],
            answer: 1,
          },
          explanation: "`get` is the checked lookup: it returns `Some(&item)` when the index exists and `None` when it does not. `v[10]` would panic instead.",
        },
        {
          prompt: "Inside `for depth in dive_log.iter()`, what is the type of `depth`?",
          question: { type: "choice", options: ["`i32`", "`&i32`, a reference to an item in the Vec", "`Vec<i32>`", "`usize`"], answer: 1 },
          explanation: "`iter()` lends each item rather than copying it out, so you get `&i32`. That is why comparisons against a plain number write `*depth`.",
        },
        {
          prompt: "Which line makes a `Vec<String>` that you can `push` onto afterwards?",
          question: {
            type: "choice",
            options: ["`let names = Vec::new();`", "`let mut names: Vec<String> = Vec::new();`", "`let names: Vec<String> = [];`", "`let mut names = vec![];` and nothing else ever uses it"],
            answer: 1,
          },
          explanation: "It needs `mut` to change it, and it needs its element type to be known. The annotation provides that. In option four the compiler has nothing to infer the element type from.",
        },
      ],
    },

    // ───────────────────────── 9 ─────────────────────────
    {
      id: "rust-basics-9-ownership",
      title: "Ownership",
      minutes: 45,
      xp: 150,
      concepts: ["ownership", "move", "Copy", "clone", "drop", "scope", "stack and heap", "E0382"],
      learn: md`### One jar, one name on the label

Every jar in the station's sample vault carries a label card, and the card names exactly one crew member who answers for that jar. Nobody else may open it, top it up or throw it out. If the jar changes hands, the card is rewritten and the previous keeper is out of the picture. When the keeper's shift ends, the jar is emptied and washed, right then, with no one left wondering whether it is still needed.

Rust treats memory the same way, and the compiler enforces it before the program ever runs. This system is called **ownership**, and it costs nothing at runtime. In plain terms:

- A value always belongs to a single variable, its **owner**. Nobody else holds it at the same time.
- The owner's scope decides the value's lifetime. When the closing brace arrives, the value is **dropped** and its memory is freed on the spot.
- Giving a value away (assigning it, or passing it to a function) **hands over** the ownership. From then on the old name is off limits.

~~~rust
{
    let label = String::from("coral core 7");   // label owns the text
    println!("{label}");
}                                               // label goes out of scope: the text is freed here
~~~

### Moves

What does this do?

~~~rust
let label = String::from("coral core 7");
let vault = label;
println!("{label}");
~~~

In many languages both names would now point at the same text. In Rust, assigning a \`String\` to another variable **moves** it: ownership transfers to \`vault\`, and \`label\` is no longer usable.

~~~text
error[E0382]: borrow of moved value: \`label\`
 --> main.rs:4:15
  |
2 |     let label = String::from("coral core 7");
  |         ----- move occurs because \`label\` has type \`String\`, which does not implement the \`Copy\` trait
3 |     let vault = label;
  |                 ----- value moved here
4 |     println!("{label}");
  |               ^^^^^^^ value borrowed here after move
  |
help: consider cloning the value if the performance cost is acceptable
  |
3 |     let vault = label.clone();
  |                      ++++++++
~~~

**Why?** A \`String\` is a small handle on the stack (a pointer, a length and a capacity) that points at the characters on the heap. Suppose the assignment copied just that handle: you would have two variables aiming at one block of heap memory, and when their scopes ended each would try to free it. That is a **double free**, a classic memory bug. So Rust does not allow it. After a move the old name is dead, which leaves one variable responsible for the cleanup. The error above is the compiler stopping you at that point, and it draws you a map: where the value was created, where it moved, and where you tried to use it afterwards.

Read those messages as a conversation with a very careful colleague. They always tell you the three places that matter.

### Passing to a function is a move too

~~~rust
fn seal_in_vault(label: String) -> usize {
    println!("Vault sealed: {label}");
    label.len()
}                                           // label is dropped here: the function owned it

let core_label = String::from("coral core 7");
let chars = seal_in_vault(core_label);      // ownership moves into the function
// core_label is gone now
~~~

A function that wants to give the value back can **return** it:

~~~rust
fn stamp(mut label: String) -> String {     // 'mut label' is the function's own variable
    label.push_str(" [stamped]");
    label                                   // ownership goes back to the caller
}
let stamped = stamp(backup_label);          // moved in, and a new owner comes out
~~~

That works, but handing a value in and out of every function would be exhausting. Lesson 10 fixes it with borrowing.

### Copy types: some values are just copied

Not everything moves. A plain number lives entirely on the stack and copying it is as cheap as a move, so Rust simply copies:

~~~rust
let depth = 42;
let same = depth;       // a copy: both are usable
println!("{depth} {same}");
~~~

Types with this behaviour implement the **\`Copy\`** trait: all integers and floats, \`bool\`, \`char\`, shared references (\`&T\`), and tuples and arrays made only of Copy types. \`String\`, \`Vec\` and anything else that owns heap memory is **not** Copy, because copying it would mean a second owner.

### Clone: an explicit deep copy

When you really do want two independent copies of heap data, ask for it with \`.clone()\`:

~~~rust
let core_label = String::from("coral core 7");
let backup_label = core_label.clone();      // new heap block, new owner
~~~

Now both are valid and independent. Cloning can be expensive (it copies everything), which is exactly why Rust makes you write it. You can see where the costs are by reading the code. A good habit: when the compiler says "value moved" and you are not sure what to do, first ask whether you need ownership at all (see next lesson) before you reach for \`clone\`.

~~~rust
let mut extended_log = dive_log.clone();
extended_log.push(50);           // changes only the copy
~~~

### Collections and moves

\`for depth in dive_log { ... }\` takes the whole Vec: it is moved into the loop and gone afterwards. And you cannot move *one item out of the middle* of a Vec of Strings:

~~~text
error[E0507]: cannot move out of index of \`Vec<String>\`
~~~

Either borrow the item (\`&names[0]\`) or clone it (\`names[0].clone()\`).

### Common mistakes

- Using a variable after it was moved into a function, a loop, or another variable (E0382). Ask: do I still need it? Borrow it (lesson 10), clone it, or restructure.
- Cloning everywhere to make the error go away. It compiles, but you have paid for copies you did not need.
- Believing numbers move. They do not, because they are Copy.
- Forgetting that \`let b = a;\` for a \`String\` is a move even though no function is involved.

### Why "the borrow checker is a friend"

Every one of these errors is a bug you would otherwise find at 3 a.m.: a use-after-free, a double free, two parts of a program fighting over the same data. Rust asks you to tell the compiler about ownership, and in exchange it proves there are none of those. Programmers who stay with Rust for a month usually stop fighting the compiler and start asking it questions.`,
      mission: md`The station's sample vault keeps one label per sample, and a label must have exactly one owner: the person who sealed it in. The crew has already had trouble when two people thought they owned the same jar.

You will write two small functions that take ownership of a label, move values around on purpose, and clone only where a copy is really needed. When this lesson passes, the **Sample vault** lights up.`,
      tasks: [
        "Above the divider write fn seal_in_vault(label: String) -> usize that prints Vault sealed: {label} and returns label.len()",
        "Above the divider write fn stamp(mut label: String) -> String that appends \" [stamped]\" with push_str and returns the label",
        "In main: let core_label = String::from(\"coral core 7\"); let backup_label = core_label.clone(); then sealed_chars = seal_in_vault(core_label) and stamped = stamp(backup_label); print the stamped label",
        "Make an independent copy of the log: let mut extended_log = dive_log.clone(); push 50 onto the copy and print Original log: 5 entries, extended copy: 6 entries",
        "Copy a number: let copied_depth = depth_m; and print 42 and 42 are both usable",
        "Send sealedChars, stamped (&stamped), originalLen, extendedLen and copiedDepth to the board",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: ownership. Write two functions in this part of the file (above main):
// fn seal_in_vault(label: String) -> usize   prints "Vault sealed: {label}" and returns label.len()
// fn stamp(mut label: String) -> String      push_str(" [stamped]") and return the label
${MAIN_DIVIDER}
// 1. let core_label = String::from("coral core 7");   let backup_label = core_label.clone();
//    let sealed_chars = seal_in_vault(core_label);       // core_label is MOVED into the function
//    let stamped = stamp(backup_label);   println!("{stamped}");
// 2. let mut extended_log = dive_log.clone();  extended_log.push(50);
//    println!("Original log: {} entries, extended copy: {} entries", dive_log.len(), extended_log.len());
// 3. let copied_depth = depth_m;   println!("{depth_m} and {copied_depth} are both usable");
// Try it: after the move, add  println!("{core_label}");  to see error E0382 on the station, then remove it.
// scene keys: sealedChars, stamped, originalLen, extendedLen, copiedDepth
`,
      solutionAdd: rs`fn seal_in_vault(label: String) -> usize {
    println!("Vault sealed: {label}");
    label.len()
}

fn stamp(mut label: String) -> String {
    label.push_str(" [stamped]");
    label
}
${MAIN_DIVIDER}
// Lesson 9: ownership.
let core_label = String::from("coral core 7");
let backup_label = core_label.clone();
let sealed_chars = seal_in_vault(core_label);
let stamped = stamp(backup_label);
println!("{stamped}");

let mut extended_log = dive_log.clone();
extended_log.push(50);
println!("Original log: {} entries, extended copy: {} entries", dive_log.len(), extended_log.len());

let copied_depth = depth_m;
println!("{depth_m} and {copied_depth} are both usable");

scene("sealedChars", sealed_chars);
scene("stamped", &stamped);
scene("originalLen", dive_log.len());
scene("extendedLen", extended_log.len());
scene("copiedDepth", copied_depth);`,
      explanation:
        "seal_in_vault takes a String by value, so calling it moves core_label into the function: the function owns it until it returns, and it is dropped there. To keep a second label, the code clones it first, which creates an independent String on the heap. stamp takes ownership, changes its own mutable copy of the variable and returns it, so a new owner comes out. Cloning the Vec gives an independent list, so pushing to the copy leaves the original at 5 entries. A number is Copy, so copied_depth is just another 42 and depth_m is still usable.",
      hints: [
        { id: "h1", title: "The two functions", content: "fn seal_in_vault(label: String) -> usize { println!(\"Vault sealed: {label}\"); label.len() } and fn stamp(mut label: String) -> String { label.push_str(\" [stamped]\"); label } Both go above the divider line, before main. The last line of stamp has no semicolon: it is the returned value." },
        { id: "h2", title: "Moves in main", content: "let core_label = String::from(\"coral core 7\"); let backup_label = core_label.clone(); let sealed_chars = seal_in_vault(core_label); let stamped = stamp(backup_label); After these lines core_label and backup_label are both moved away; use stamped from now on." },
        { id: "h3", title: "Cloning the log", content: "let mut extended_log = dive_log.clone(); extended_log.push(50); dive_log is still yours, because you cloned it instead of moving it. For the board: scene(\"stamped\", &stamped); (lend the String with &) and scene(\"originalLen\", dive_log.len());" },
      ],
      tests: [
        {
          id: "t1",
          description: "The label is moved into the vault function",
          assertionCode: js`
assert(lines.includes("Vault sealed: coral core 7"), 'seal_in_vault must print "Vault sealed: coral core 7" using its label parameter.');
assertEqual(scene.sealedChars, 12, 'sealedChars (the vault function returns label.len(); "coral core 7" has 12 bytes)');`,
        },
        {
          id: "t2",
          description: "stamp takes ownership and hands a new label back",
          assertionCode: js`
assertEqual(scene.stamped, "coral core 7 [stamped]", 'stamped (push_str(" [stamped]") on the clone, then return it)');
assert(lines.includes("coral core 7 [stamped]"), "Print the stamped label with println!.");`,
        },
        {
          id: "t3",
          description: "clone makes an independent copy of the Vec",
          assertionCode: js`
assertEqual(scene.originalLen, 5, "originalLen (dive_log must still have its 5 entries)");
assertEqual(scene.extendedLen, 6, "extendedLen (the clone got one more push)");
assert(lines.includes("Original log: 5 entries, extended copy: 6 entries"), 'Print the line "Original log: 5 entries, extended copy: 6 entries".');`,
        },
        {
          id: "t4",
          description: "A number is Copy: both names stay usable",
          assertionCode: js`
assertEqual(scene.copiedDepth, 42, "copiedDepth");
assert(lines.includes("42 and 42 are both usable"), 'Print the line "42 and 42 are both usable".');`,
        },
      ],
      unlocks: ["rs-vault"],
      checks: [
        {
          prompt: "What happens when you compile this?\n\n~~~rust\nlet a = String::from(\"reef\");\nlet b = a;\nprintln!(\"{a}\");\n~~~",
          question: {
            type: "choice",
            options: [
              "It prints reef",
              "error[E0382]: borrow of moved value: `a`",
              "It compiles but prints nothing",
              "error[E0308]: mismatched types",
            ],
            answer: 1,
          },
          explanation: "Assigning a `String` to another variable moves it, so `a` has no value afterwards. The compiler reports where the value was moved and where you used it too late.",
        },
        {
          prompt: "Which of these types is `Copy`, so that `let b = a;` leaves `a` usable?",
          question: { type: "choice", options: ["`String`", "`Vec<i32>`", "`i32`", "`Box<i32>`"], answer: 2 },
          explanation: "Integers (and floats, bool, char) are copied bit for bit, so there is never a second owner of heap memory. `String` and `Vec` own heap memory, so assigning them moves.",
        },
        {
          prompt: "When does Rust free the memory of a `String` that is a local variable?",
          question: {
            type: "choice",
            options: [
              "When a garbage collector next runs",
              "When the program ends",
              "When its owner goes out of scope (at the closing brace)",
              "Only when you call free()",
            ],
            answer: 2,
          },
          explanation: "Rule three of ownership: when the owner goes out of scope the value is dropped. There is no collector and nothing to remember to call, and the moment is known at compile time.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "rust-basics-10-borrowing",
      title: "Borrowing",
      minutes: 45,
      xp: 150,
      concepts: ["references", "&T", "&mut T", "dereference", "borrow rules", "E0499", "E0502", "non-lexical lifetimes"],
      learn: md`### Lending instead of giving

Last lesson, every function that wanted to look at your data had to take it away and, if you were lucky, give it back. Nobody writes real programs that way. The answer is a **reference**: a way of using a value without owning it. Creating one is called **borrowing**. The owner stays the owner, and the borrow ends when the borrower is done.

~~~rust
fn average_depth(log: &Vec<i32>) -> f64 {        // takes a reference: "I only want to look"
    let mut sum = 0;
    for depth in log.iter() {
        sum += *depth;
    }
    sum as f64 / log.len() as f64
}

let avg = average_depth(&dive_log);              // lend dive_log to the function
println!("{}", dive_log.len());                  // still ours: nothing was moved
~~~

The \`&\` in the type (\`&Vec<i32>\`) and the \`&\` in the call (\`&dive_log\`) go together. The ampersand means "a reference to". You have been using it already: \`&mut line\` for \`read_line\`, and \`&dive_log\` for \`scene\`.

### Two kinds of borrow

- **\`&T\` — a shared reference.** Read only. You may have **any number** of them at once.
- **\`&mut T\` — a mutable (exclusive) reference.** It may change the value. You may have **only one**, and **no shared references may exist at the same time**.

The rule in one sentence: **at any moment, a value may have many readers or one writer, never both.**

~~~rust
fn record_dive(log: &mut Vec<i32>, depth: i32) {
    log.push(depth);                              // changes the caller's Vec
}

record_dive(&mut dive_log, 28);                   // lend it mutably (dive_log must be \`mut\`)
~~~

**Why this rule?** Because every nasty bug of shared mutable data needs both at once. A reader that is halfway through a list while a writer changes it. Two threads writing the same number. A pointer into a buffer that was reallocated. Rust forbids the combination at compile time, with no runtime cost. The famous example:

~~~rust
let first = &dive_log[0];          // a shared borrow into the Vec's memory
dive_log.push(9);                  // push may move all items to a bigger block...
println!("{first}");               // ...so \`first\` could point at freed memory. Not allowed.
~~~

~~~text
error[E0502]: cannot borrow \`dive_log\` as mutable because it is also borrowed as immutable
 --> main.rs:4:5
  |
3 |     let first = &dive_log[0];
  |                  -------- immutable borrow occurs here
4 |     dive_log.push(9);
  |     ^^^^^^^^^^^^^^^^ mutable borrow occurs here
5 |     println!("{first}");
  |               ------- immutable borrow later used here
~~~

The three labels tell the story again: where the first borrow began, where the conflicting borrow happens, and where the first one is still needed. The cure is to finish with \`first\` before you push, or copy the number out (\`let first = dive_log[0];\` copies an \`i32\`).

Two writers conflict the same way: error[E0499]: cannot borrow \`log\` as mutable more than once at a time.

### Borrows last until their last use

A borrow does not last to the end of the block. It lasts until **the last time the reference is used** (the compiler calls this non-lexical lifetimes). That is why code like this is fine:

~~~rust
let r = &dive_log;
println!("{}", r.len());            // last use of r: the borrow ends here
dive_log.push(5);                   // so a mutable borrow is allowed again
~~~

### Dereferencing

A \`&mut f64\` is a reference, not the number. To change the number behind it you **dereference** with \`*\`:

~~~rust
fn top_up(level: &mut f64, amount: f64) {
    *level += amount;
    if *level > 100.0 {
        *level = 100.0;
    }
}

top_up(&mut oxygen_pct, 20.0);
~~~

For method calls and field access Rust dereferences automatically, which is why \`log.push(depth)\` and \`log.len()\` need no star.

### References cannot dangle

A reference can never outlive what it points to. You cannot return a reference to a local variable:

~~~rust
fn broken() -> &String {                 // error[E0106]: missing lifetime specifier
    let s = String::from("x");
    &s                                   // s is dropped at the closing brace
}
~~~

The compiler would otherwise hand your caller a pointer into freed memory. Return the owned value instead (\`-> String\`). The ideas behind that error message, **lifetimes**, are what you learn in the next project of this path. For now, remember: you can borrow something that lives longer than you, never something that dies first.

### Which parameter type should I write?

- A function that only **reads** a value takes \`&T\`.
- A function that must **change** the caller's value takes \`&mut T\`.
- A function that must **consume** the value (store it, destroy it, send it away) takes \`T\`.
- Small \`Copy\` values (numbers, bools) are simply taken by value.

### Common mistakes

- Forgetting the \`&\` or \`&mut\` at the call site: expected \`&Vec<i32>\`, found \`Vec<i32>\` is E0308, and the compiler suggests the fix.
- Forgetting \`mut\` on the variable you lend mutably: E0596.
- Keeping an old reference alive across a change (E0502). Shorten its life, or copy the value out.
- Forgetting the \`*\` when you change a number through \`&mut\`.`,
      mission: md`Divers and drones all use the same dive log, and the oxygen tank has to be topped up from several places in the code. Handing the whole log to every function and getting it back would be silly, and cloning it every time would be wasteful.

You will write three functions that **borrow**: one to read the log, one to add a dive to it, and one to top up the oxygen level in place. When this lesson passes, the **Tether line** lights up.`,
      tasks: [
        "Above the divider write fn average_depth(log: &Vec<i32>) -> f64 (a loop with .iter(), sum as f64 / log.len() as f64)",
        "Write fn record_dive(log: &mut Vec<i32>, depth: i32) that pushes the depth, and fn top_up(level: &mut f64, amount: f64) that adds the amount and caps the level at 100.0",
        "In main: avg_before = average_depth(&dive_log); then record_dive(&mut dive_log, 28); then avg_after = average_depth(&dive_log)",
        "Call top_up(&mut oxygen_pct, 20.0)",
        "Print Average depth 24.2 m -> 24.8 m (6 dives) and Oxygen topped up to 100.0%",
        "Send avgBefore, avgAfter, diveLog (&dive_log) and oxygenPct to the board",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: borrowing. Write these three functions in this part of the file (above main):
// fn average_depth(log: &Vec<i32>) -> f64         read only; sum the depths, then sum as f64 / log.len() as f64
// fn record_dive(log: &mut Vec<i32>, depth: i32)  pushes onto the caller's Vec
// fn top_up(level: &mut f64, amount: f64)         *level += amount;  and never above 100.0
${MAIN_DIVIDER}
// 1. let avg_before = average_depth(&dive_log);
//    record_dive(&mut dive_log, 28);
//    let avg_after = average_depth(&dive_log);
// 2. top_up(&mut oxygen_pct, 20.0);
// Print:  Average depth 24.2 m -> 24.8 m (6 dives)       ({avg_before:.1}, {avg_after:.1}, dive_log.len())
//         Oxygen topped up to 100.0%
// Try it: hold  let first = &dive_log[0];  across the record_dive call and print it afterwards to see E0502.
// scene keys: avgBefore, avgAfter, diveLog, oxygenPct
`,
      solutionAdd: rs`fn average_depth(log: &Vec<i32>) -> f64 {
    let mut sum = 0;
    for depth in log.iter() {
        sum += *depth;
    }
    sum as f64 / log.len() as f64
}

fn record_dive(log: &mut Vec<i32>, depth: i32) {
    log.push(depth);
}

fn top_up(level: &mut f64, amount: f64) {
    *level += amount;
    if *level > 100.0 {
        *level = 100.0;
    }
}
${MAIN_DIVIDER}
// Lesson 10: borrowing.
let avg_before = average_depth(&dive_log);
record_dive(&mut dive_log, 28);
let avg_after = average_depth(&dive_log);

top_up(&mut oxygen_pct, 20.0);

println!("Average depth {avg_before:.1} m -> {avg_after:.1} m ({} dives)", dive_log.len());
println!("Oxygen topped up to {oxygen_pct:.1}%");

scene("avgBefore", avg_before);
scene("avgAfter", avg_after);
scene("diveLog", &dive_log);
scene("oxygenPct", oxygen_pct);`,
      explanation:
        "average_depth takes &Vec<i32>, a shared reference, so the caller keeps the log and many readers could look at it at once. record_dive takes &mut Vec<i32>, an exclusive reference that is allowed to push, and the caller has to write &mut dive_log. top_up changes a number through &mut f64, so it dereferences with * to read and write the value. Before the new dive the average is 121 / 5 = 24.2; after it, 149 / 6 is about 24.8. The 87.5 + 20.0 would be 107.5, so the function caps it at 100.0.",
      hints: [
        { id: "h1", title: "Reading through a reference", content: "fn average_depth(log: &Vec<i32>) -> f64 { let mut sum = 0; for depth in log.iter() { sum += *depth; } sum as f64 / log.len() as f64 } The last line has no semicolon: it is the returned f64." },
        { id: "h2", title: "Changing through a reference", content: "fn record_dive(log: &mut Vec<i32>, depth: i32) { log.push(depth); } and fn top_up(level: &mut f64, amount: f64) { *level += amount; if *level > 100.0 { *level = 100.0; } } With &mut you need the star to touch the number itself." },
        { id: "h3", title: "Calling them", content: "Lend with & for reading and &mut for changing: let avg_before = average_depth(&dive_log); record_dive(&mut dive_log, 28); top_up(&mut oxygen_pct, 20.0); dive_log and oxygen_pct were both declared with mut earlier, which is why this is allowed." },
      ],
      tests: [
        {
          id: "t1",
          description: "average_depth reads the log through a shared reference",
          assertionCode: js`
assertClose(scene.avgBefore, 24.2, 0.001, "avgBefore (121 / 5 for the five dives in the log)");
assertClose(scene.avgAfter, 24.8333, 0.001, "avgAfter (149 / 6 after the new dive)");`,
        },
        {
          id: "t2",
          description: "record_dive changes the caller's Vec",
          assertionCode: js`assertEqual(scene.diveLog, [12, 18, 25, 31, 35, 28], 'diveLog (record_dive(&mut dive_log, 28) pushes onto the same Vec; send it again with scene("diveLog", &dive_log);)');`,
        },
        {
          id: "t3",
          description: "top_up changes the oxygen level in place and caps it",
          assertionCode: js`assertEqual(scene.oxygenPct, 100, "oxygenPct (87.5 + 20.0 is capped at 100.0 through the &mut f64)");`,
        },
        {
          id: "t4",
          description: "The two result lines are printed",
          assertionCode: js`
assert(lines.includes("Average depth 24.2 m -> 24.8 m (6 dives)"), 'Print the line "Average depth 24.2 m -> 24.8 m (6 dives)" using {avg_before:.1}, {avg_after:.1} and dive_log.len().');
assert(lines.includes("Oxygen topped up to 100.0%"), 'Print the line "Oxygen topped up to 100.0%" using {oxygen_pct:.1}.');`,
        },
      ],
      unlocks: ["rs-tether"],
      checks: [
        {
          prompt: "How many `&mut` references to the same value can exist at the same moment?",
          question: { type: "number", answer: 1 },
          explanation: "One. While a mutable reference is alive, nothing else (neither another `&mut` nor a shared `&`) may use the value. Many shared `&` references are fine as long as there is no `&mut`.",
        },
        {
          prompt: "Why is this rejected with E0502?\n\n~~~rust\nlet first = &dive_log[0];\ndive_log.push(9);\nprintln!(\"{first}\");\n~~~",
          question: {
            type: "choice",
            options: [
              "push may move the items to a new block of memory, which would leave `first` pointing at freed memory",
              "Vec cannot be indexed with a reference",
              "println! cannot print a reference",
              "dive_log must be Copy",
            ],
            answer: 0,
          },
          explanation: "A shared borrow (`first`) is still needed after the mutable borrow that `push` needs. If the Vec reallocated, `first` would dangle. Rust refuses the combination of a live reader and a writer.",
        },
        {
          prompt: "A function receives `level: &mut f64`. How do you add 5.0 to the number it points to?",
          question: { type: "choice", options: ["`level += 5.0;`", "`*level += 5.0;`", "`&level += 5.0;`", "`level.add(5.0);`"], answer: 1 },
          explanation: "`level` is a reference. The star dereferences it to reach the `f64`, so `*level += 5.0` changes the caller's variable. Method calls and field access dereference automatically, but operators on the number itself need the star.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "rust-basics-11-strings",
      title: "String and &str",
      minutes: 40,
      xp: 130,
      concepts: ["String", "&str", "slices", "UTF-8", "bytes vs chars", "push_str", "format!", "split", "collect", "first_word"],
      learn: md`### Two string types, and why

Rust has two main types for text, and the difference is exactly the ownership idea from the last two lessons.

- **\`String\`** is **owned**, growable text. It lives on the heap, you can append to it, and when its owner goes out of scope it is freed. It is like a \`Vec\` of bytes that is guaranteed to be valid UTF-8.
- **\`&str\`** (say "string slice") is a **borrowed view** of text that someone else owns: just a pointer and a length. It cannot grow. A string literal like \`"Halcyon"\` is a \`&str\` that points into the program itself (its full type is \`&'static str\`, which means "valid for the whole run").

~~~rust
let owned: String = String::from("coral");     // heap text we own
let view: &str = &owned;                       // a borrowed view of all of it
let literal: &str = "kelp";                    // a view of text inside the program
let also_owned = "kelp".to_string();           // .to_string() makes an owned String from a &str
~~~

Rule of thumb: **struct fields and return values that must keep the text use \`String\`; function parameters that only read it use \`&str\`.** A \`&str\` parameter accepts a literal, a \`&String\`, or a slice of either, so it is the most flexible choice:

~~~rust
fn first_word(text: &str) -> &str {
    match text.find(' ') {
        Some(end) => &text[..end],      // a slice: bytes 0 up to (not including) \`end\`
        None => text,
    }
}
~~~

(The return type \`&str\` also borrows from \`text\`. The compiler infers that, because there is only one input reference. With two reference inputs it asks you to say which one with a **lifetime**: error[E0106]: missing lifetime specifier. The next project of this path teaches them.)

### UTF-8: bytes are not characters

Rust strings are always valid UTF-8. Letters in English use one byte, but \`°\`, \`é\` and \`🐠\` use two to four. So you have to be specific about what you count:

~~~rust
let reading = String::from("18°C");
reading.len()                // 5   bytes ('°' takes two)
reading.chars().count()      // 4   characters
~~~

For this reason you cannot index a string by number: \`reading[0]\` is error[E0277]: the type \`str\` cannot be indexed by \`{integer}\`. What would "the third character" cost? You would have to scan from the start. You can **slice** by byte range, \`&reading[0..2]\`, and it works only if both ends fall on character boundaries. Cutting through the middle of the degree sign panics: *byte index 3 is not a char boundary*. For character-wise work use \`.chars()\`.

### Building and changing a \`String\`

~~~rust
let mut summary = String::new();
summary.push_str("SURFACE");                  // append a &str
summary.push('!');                           // append one char
summary += " says: ";                        // += works with a &str on the right
summary += &format!("{} words", 6);          // format! builds a new String like println! but returns it
~~~

\`format!\` is \`println!\` that gives you the text instead of printing it. It is the cleanest way to put pieces together. There is also \`+\`, but it **moves** its left side: \`let c = a + &b;\` uses up \`a\`. You cannot add two \`&str\`: \`"a" + "b"\` is error[E0369]: cannot add \`&str\` to \`&str\`.

### The methods worth knowing

~~~rust
text.trim()                  // &str without surrounding whitespace
text.to_uppercase()          // a new String       (to_lowercase too)
text.contains("clear")       // bool
text.starts_with("SURF")     // bool               (ends_with too)
text.find(':')               // Option<usize>: byte position of the first match
text.replace("clear", "stormy")   // a new String
text.split_whitespace()      // iterator over the words
text.split(',')              // iterator over the pieces between commas
text.lines()                 // iterator over lines
text.len()  text.is_empty()
~~~

A method that returns an iterator is usually followed by \`.count()\` or \`.collect()\`. \`collect\` gathers the pieces into a collection and needs a type to build, here a \`Vec\` of string slices:

~~~rust
let words: Vec<&str> = message.split_whitespace().collect();
println!("{}", words.len());
~~~

Note that each word is a \`&str\` slice that points back into \`message\`. Nothing was copied, and the borrow checker makes sure \`message\` stays alive and unchanged while \`words\` exists.

### Slices of Vecs and arrays

The same idea works for lists. \`&dive_log[1..3]\` is a **slice** of type \`&[i32]\`: a borrowed view of part of a Vec or array. Functions that only read a list should take \`&[i32]\` rather than \`&Vec<i32>\`, for the same reason as \`&str\`: it accepts a Vec, an array, or a part of either.

### Common mistakes

- \`let name: String = "Mara";\`: error[E0308]: mismatched types, expected \`String\`, found \`&str\`. The compiler suggests \`.to_string()\`.
- Passing a \`String\` where a \`&str\` is wanted without the \`&\`.
- Using \`len()\` as a character count for non-English text.
- Slicing at a byte position inside a multi-byte character.
- Building text with \`+\` and being surprised that the left String was moved. Prefer \`format!\`.`,
      mission: md`The surface sends radio messages in plain text, padded with stray spaces, and Halcyon keeps its own log lines. The radio mast must trim, search and split these messages, shout the important ones in capitals, and assemble a one-line summary.

It also needs to be honest about degrees: the thermometer reports \`18°C\`, which is five bytes but four characters. When this lesson passes, the **Radio mast** lights up.`,
      tasks: [
        "Above the divider write fn first_word(text: &str) -> &str that returns the part of the text before the first space (use find(' ') with a match, or the whole text if there is none)",
        "In main: let raw_message = String::from(\"  SURFACE: weather clear, sea state 2  \"); let message = raw_message.trim(); then words = message.split_whitespace().collect() as a Vec<&str> and word_count = words.len()",
        "sender = first_word(message).trim_end_matches(':'); shout = message.to_uppercase(); all_clear = message.contains(\"clear\")",
        "let reading_text = String::from(\"18°C\"); count reading_bytes with .len() and reading_chars with .chars().count()",
        "Build summary with String::new(), push_str(sender), push_str(\" says: \") and += &format!(\"{word_count} words, all clear: {all_clear}\"). Print summary, shout, then \"18°C\" is 5 bytes but 4 characters",
        "Send message, sender, wordCount, shout, allClear, readingBytes, readingChars and summary to the board",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: the radio mast. Write this function in this part of the file (above main):
// fn first_word(text: &str) -> &str      match text.find(' ') { Some(end) => &text[..end], None => text }
${MAIN_DIVIDER}
// 1. let raw_message = String::from("  SURFACE: weather clear, sea state 2  ");
//    let message = raw_message.trim();
//    let words: Vec<&str> = message.split_whitespace().collect();   let word_count = words.len();
// 2. let sender = first_word(message).trim_end_matches(':');
//    let shout = message.to_uppercase();   let all_clear = message.contains("clear");
// 3. let reading_text = String::from("18°C");  reading_bytes = reading_text.len();  reading_chars = reading_text.chars().count();
// 4. let mut summary = String::new(); summary.push_str(sender); summary.push_str(" says: ");
//    summary += &format!("{word_count} words, all clear: {all_clear}");
// Print:  SURFACE says: 6 words, all clear: true
//         SURFACE: WEATHER CLEAR, SEA STATE 2
//         "18°C" is 5 bytes but 4 characters
// scene keys: message, sender, wordCount, shout, allClear, readingBytes, readingChars, summary
`,
      solutionAdd: rs`fn first_word(text: &str) -> &str {
    match text.find(' ') {
        Some(end) => &text[..end],
        None => text,
    }
}
${MAIN_DIVIDER}
// Lesson 11: the radio mast.
let raw_message = String::from("  SURFACE: weather clear, sea state 2  ");
let message = raw_message.trim();
let words: Vec<&str> = message.split_whitespace().collect();
let word_count = words.len();
let sender = first_word(message).trim_end_matches(':');
let shout = message.to_uppercase();
let all_clear = message.contains("clear");

let reading_text = String::from("18°C");
let reading_bytes = reading_text.len();
let reading_chars = reading_text.chars().count();

let mut summary = String::new();
summary.push_str(sender);
summary.push_str(" says: ");
summary += &format!("{word_count} words, all clear: {all_clear}");

println!("{summary}");
println!("{shout}");
println!("\"{reading_text}\" is {reading_bytes} bytes but {reading_chars} characters");

scene("message", message);
scene("sender", sender);
scene("wordCount", word_count);
scene("shout", &shout);
scene("allClear", all_clear);
scene("readingBytes", reading_bytes);
scene("readingChars", reading_chars);
scene("summary", &summary);`,
      explanation:
        "message is a &str view into raw_message, so trimming copies nothing. first_word takes a &str and returns a slice of it, up to the first space: \"SURFACE:\"; trim_end_matches(':') drops the colon. split_whitespace().collect() gathers the six words into a Vec<&str>. to_uppercase builds a new owned String. The degree sign takes two bytes in UTF-8, so \"18°C\" has 5 bytes but 4 characters. summary starts as an empty owned String and grows with push_str and += a formatted String.",
      hints: [
        { id: "h1", title: "first_word", content: "fn first_word(text: &str) -> &str { match text.find(' ') { Some(end) => &text[..end], None => text, } } find returns the position of the first space, or nothing. &text[..end] is the slice from the start up to that position." },
        { id: "h2", title: "Views and owned text", content: "let message = raw_message.trim(); is a view into raw_message. to_uppercase() returns a brand-new String. For the words: let words: Vec<&str> = message.split_whitespace().collect(); and word_count is words.len()." },
        { id: "h3", title: "Building the summary", content: "let mut summary = String::new(); summary.push_str(sender); summary.push_str(\" says: \"); summary += &format!(\"{word_count} words, all clear: {all_clear}\"); For the board lend Strings with & (scene(\"shout\", &shout);) but a &str such as sender can go in directly." },
      ],
      tests: [
        {
          id: "t1",
          description: "The message is trimmed and split into words",
          assertionCode: js`
assertEqual(scene.message, "SURFACE: weather clear, sea state 2", 'message (trim raw_message and send the &str with scene("message", message);)');
assertEqual(scene.wordCount, 6, "wordCount (split_whitespace().collect(), then len())");`,
        },
        {
          id: "t2",
          description: "first_word returns a slice, and the colon is trimmed off",
          assertionCode: js`assertEqual(scene.sender, "SURFACE", "sender (first_word(message) is SURFACE: and trim_end_matches(':') removes the colon)");`,
        },
        {
          id: "t3",
          description: "to_uppercase and contains",
          assertionCode: js`
assertEqual(scene.shout, "SURFACE: WEATHER CLEAR, SEA STATE 2", "shout");
assertEqual(scene.allClear, true, 'allClear (message.contains("clear"))');
assert(lines.includes("SURFACE: WEATHER CLEAR, SEA STATE 2"), "Print the shouted message with println!.");`,
        },
        {
          id: "t4",
          description: "Bytes and characters differ for the degree sign",
          assertionCode: js`
assertEqual(scene.readingBytes, 5, "readingBytes (len() counts bytes; the degree sign is two bytes)");
assertEqual(scene.readingChars, 4, "readingChars (chars().count())");
assert(lines.includes('"18°C" is 5 bytes but 4 characters'), 'Print the line "18°C" is 5 bytes but 4 characters (the quote marks are part of the text).');`,
        },
        {
          id: "t5",
          description: "The summary is assembled from pieces",
          assertionCode: js`
assertEqual(scene.summary, "SURFACE says: 6 words, all clear: true", "summary");
assert(lines.includes("SURFACE says: 6 words, all clear: true"), "Print the summary with println!.");`,
        },
      ],
      unlocks: ["rs-radio"],
      checks: [
        {
          prompt: "Which type is the string literal `\"kelp\"`?",
          question: { type: "choice", options: ["`String`", "`&str`", "`str`", "`Vec<char>`"], answer: 1 },
          explanation: "A literal is a borrowed view of text stored inside the program: a `&str` (more exactly `&'static str`). To get an owned `String` you call `.to_string()` or `String::from`.",
        },
        {
          prompt: "`let reading = String::from(\"18°C\");` What does `reading.len()` return?",
          question: { type: "number", answer: 5 },
          explanation: "`len()` counts **bytes**. The degree sign is two bytes in UTF-8, so 1 + 1 + 2 + 1 = 5. `reading.chars().count()` would give 4.",
        },
        {
          prompt: "Which function signature is the most flexible for a function that only reads some text?",
          question: {
            type: "choice",
            options: ["`fn show(text: String)`", "`fn show(text: &String)`", "`fn show(text: &str)`", "`fn show(text: str)`"],
            answer: 2,
          },
          explanation: "`&str` accepts a string literal, a `&String` (which converts automatically) and a slice of either, and it does not take ownership. `String` would force a move or a clone, and a bare `str` has no size known at compile time, so it cannot be a parameter.",
        },
      ],
    },
  ],
};
