import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 4: The shared depot. Rc (shared ownership), RefCell (interior mutability and its runtime
 * borrow checks), associated types and constants, and a capstone dispatch day that uses everything.
 */

/** The job card, the shelf and the runner structs of lesson 16: handed to the learner in the starter. */
const DISPATCH_GIVEN = rs`#[derive(Debug, Clone, PartialEq, Eq)]
struct Job {
    id: u32,
    weight_kg: u32,
    urgency: Urgency,
}

impl Ord for Job {
    fn cmp(&self, other: &Job) -> Ordering {
        other.urgency.cmp(&self.urgency).then_with(|| self.id.cmp(&other.id))
    }
}

impl PartialOrd for Job {
    fn partial_cmp(&self, other: &Job) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl From<(u32, u32, Urgency)> for Job {
    fn from((id, weight_kg, urgency): (u32, u32, Urgency)) -> Job {
        Job { id, weight_kg, urgency }
    }
}

impl fmt::Display for Job {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "#{} ({} kg)", self.id, self.weight_kg)
    }
}

struct Shelf {
    waiting: Vec<Job>,
    delivered: Vec<Job>,
    log: Vec<String>,
}

struct LightRunner {
    callsign: String,
    shelf: Rc<RefCell<Shelf>>,
    done: u32,
}

struct HeavyRunner {
    callsign: String,
    shelf: Rc<RefCell<Shelf>>,
    done: u32,
}`;

export const chapter4: Chapter = {
  id: "shared-depot",
  title: "The shared depot",
  blurb: "Let the whole fleet share one depot: Rc for shared ownership, RefCell for changing what is shared, associated types and constants for the rules of each rig, then a full dispatch day.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "rust-traits-13-rc",
      title: "Rc: many owners of one depot",
      minutes: 35,
      xp: 150,
      concepts: ["shared ownership", "Rc<T>", "Rc::clone", "strong_count", "Rc::ptr_eq", "drop", "E0382", "E0594"],
      learn: md`### One depot, many couriers

Every courier needs to know about the depot it works from: its name and how many docks it has. Think of a pinned notice on a staff room wall. Everyone reads the same notice; nobody photocopies it, because a photocopy goes stale the moment the notice is updated. Try to give each courier a *copy* of the depot and you copy the name every time. Try to hand the *same* depot to two couriers and Rust's ownership rule says no, because a value can have only one owner:

~~~rust
struct Depot { name: String, docks: u32 }
struct Courier { callsign: String, depot: Depot }

let info = Depot { name: "Gull Quay".to_string(), docks: 6 };
let a = Courier { callsign: "A".to_string(), depot: info };
let b = Courier { callsign: "B".to_string(), depot: info };
~~~

~~~text
error[E0382]: use of moved value: \`info\`
  |     let a = Courier { callsign: "A".to_string(), depot: info };
  |                                                         ---- value moved here
  |     let b = Courier { callsign: "B".to_string(), depot: info };
  |                                                         ^^^^ value used here after move
~~~

You have met this error (E0382) since Reef Station: the first courier *took* the depot. What we want is **shared ownership**: several owners, and the depot disappears when the last one lets go.

### Rc: a counted ticket

\`Rc<T>\` (reference counted) is a smart pointer that gives exactly that. The value lives in one place, and every \`Rc\` is a ticket to it. Behind the scenes a counter records how many tickets exist. A library with one popular book works like this: it stays on the shelf until the last reader returns their card.

~~~rust
use std::rc::Rc;

struct Courier { callsign: String, depot: Rc<Depot> }

let info = Rc::new(Depot { name: "Gull Quay".to_string(), docks: 6 });
let a = Courier { callsign: "A".to_string(), depot: Rc::clone(&info) };
let b = Courier { callsign: "B".to_string(), depot: Rc::clone(&info) };
println!("{}", Rc::strong_count(&info));      // 3: info, a and b
~~~

- \`Rc::new(value)\` moves the value into shared storage; the count starts at 1.
- \`Rc::clone(&info)\` makes **another ticket**. It does *not* copy the depot, it only adds one to the count, so it is cheap. (\`info.clone()\` does the same thing; writing \`Rc::clone\` makes it obvious that no deep copy happens.)
- \`Rc::strong_count(&info)\` reads the counter.
- When an \`Rc\` goes out of scope (or you call \`drop(x)\`), the count drops by one. At zero, the depot is freed.
- \`Rc::ptr_eq(&a.depot, &b.depot)\` asks "are these two tickets for the same depot?".

You can read through an \`Rc\` as if it were the value itself: \`a.depot.name\` just works.

~~~rust
{
    let visitor = Courier { callsign: "C".to_string(), depot: Rc::clone(&info) };
    // inside this block the count is 4
}
// the block ended, visitor was dropped: the count is back to 3
~~~

### What Rc will not let you do

The shared depot is **read-only**. Two tickets to one notice cannot both rewrite it at once, so the compiler refuses any change:

~~~text
error[E0594]: cannot assign to data in an \`Rc\`
  |     other.docks = 7;
  |     ^^^^^^^^^^^^^^^ cannot assign
  = help: trait \`DerefMut\` is required to modify through a dereference, but it is not implemented for \`Rc<Depot>\`
~~~

The next lesson fixes that on purpose. Also good to know: \`Rc\` is for one thread. The thread-safe version is called \`Arc\`, and it belongs to the project after this one.

### Common mistakes

- Writing \`depot: info\` (a move) when you meant \`depot: Rc::clone(&info)\`.
- Thinking \`Rc::clone\` copies the data. It only counts.
- Trying to assign through an \`Rc\` (E0594).`,
      mission: md`Three couriers start their day at the Gull Quay depot (6 docks). Share **one** \`Depot\` between all of them with \`Rc\`, and watch the holder count move as couriers arrive, a visitor passes through, and one courier retires.

The board shows a ticket for every holder and the count at each step.`,
      tasks: [
        "Above the divider add use std::rc::Rc;, struct Depot { name: String, docks: u32 } and struct Courier { callsign: String, depot: Rc<Depot> }",
        "In main make let depot_info = Rc::new(Depot { name: \"Gull Quay\".to_string(), docks: 6 }); and keep count_created = Rc::strong_count(&depot_info); print Holders after creating: 1",
        "Make courier_a (\"Sparrow-41\") and courier_b (\"Heron-42\"), each with depot: Rc::clone(&depot_info). Print Holders with two couriers: 3 and Same depot behind both: true (Rc::ptr_eq)",
        "In an inner { } block create a visitor Courier (\"Glider-43\") sharing the depot, print Holders inside the block: 4 (Glider-43 is visiting) and keep the count; after the block print Holders after the block: 3",
        "Call drop(courier_b); print Holders after Heron-42 retires: 2 and Sparrow-41 works from Gull Quay (6 docks) (read through courier_a.depot)",
        "Send scene(\"depot\", ...) with name, docks, holders (the callsigns: Sparrow-41, Heron-42) and steps: five records with label and count for created, two couriers, inside block, after block, retired",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: Rc. Above main:
//   use std::rc::Rc;      struct Depot { name: String, docks: u32 }      struct Courier { callsign: String, depot: Rc<Depot> }
${MAIN_DIVIDER}
// let depot_info = Rc::new(Depot { name: "Gull Quay".to_string(), docks: 6 });         print  Holders after creating: 1
// let courier_a = Courier { callsign: "Sparrow-41".to_string(), depot: Rc::clone(&depot_info) };   courier_b = "Heron-42" the same way
// print  Holders with two couriers: 3        Same depot behind both: true           (Rc::strong_count, Rc::ptr_eq)
// { let visitor = Courier { "Glider-43", Rc::clone(&depot_info) }; ... print  Holders inside the block: 4 (Glider-43 is visiting) }       then  Holders after the block: 3
// drop(courier_b);   print  Holders after Heron-42 retires: 2          Sparrow-41 works from Gull Quay (6 docks)
// scene("depot", Json::new().with("name", ..).with("docks", ..).with("holders", vec!["Sparrow-41", "Heron-42"]).with("steps", vec![ Json::new().with("label", "created").with("count", ..), ... ]));
`,
      solutionAdd: rs`use std::rc::Rc;

struct Depot {
    name: String,
    docks: u32,
}

struct Courier {
    callsign: String,
    depot: Rc<Depot>,
}
${MAIN_DIVIDER}
// Lesson 13: one depot, many owners.
let depot_info = Rc::new(Depot { name: "Gull Quay".to_string(), docks: 6 });
let count_created = Rc::strong_count(&depot_info);
println!("Holders after creating: {}", count_created);

let courier_a = Courier { callsign: "Sparrow-41".to_string(), depot: Rc::clone(&depot_info) };
let courier_b = Courier { callsign: "Heron-42".to_string(), depot: Rc::clone(&depot_info) };
let count_two = Rc::strong_count(&depot_info);
println!("Holders with two couriers: {}", count_two);
println!("Same depot behind both: {}", Rc::ptr_eq(&courier_a.depot, &courier_b.depot));

let count_inside;
{
    let visitor = Courier { callsign: "Glider-43".to_string(), depot: Rc::clone(&depot_info) };
    count_inside = Rc::strong_count(&depot_info);
    println!("Holders inside the block: {} ({} is visiting)", count_inside, visitor.callsign);
}
let count_after = Rc::strong_count(&depot_info);
println!("Holders after the block: {}", count_after);

let retiring = courier_b.callsign.clone();
drop(courier_b);
let count_retired = Rc::strong_count(&depot_info);
println!("Holders after {} retires: {}", retiring, count_retired);
println!("{} works from {} ({} docks)", courier_a.callsign, courier_a.depot.name, courier_a.depot.docks);

scene(
    "depot",
    Json::new()
        .with("name", &depot_info.name)
        .with("docks", depot_info.docks)
        .with("holders", vec![courier_a.callsign.clone(), retiring.clone()])
        .with(
            "steps",
            vec![
                Json::new().with("label", "created").with("count", count_created),
                Json::new().with("label", "two couriers").with("count", count_two),
                Json::new().with("label", "inside block").with("count", count_inside),
                Json::new().with("label", "after block").with("count", count_after),
                Json::new().with("label", "retired").with("count", count_retired),
            ],
        ),
);`,
      explanation:
        "Rc::new puts the Depot in shared storage with a count of 1. Every Rc::clone adds a ticket (and one to the count) without copying the depot; every dropped ticket subtracts one, and at zero the depot is freed. The visitor's ticket lives only inside the inner block, so the count rises to 4 and falls back to 3, and drop(courier_b) releases the retiring courier's ticket early. Reading through an Rc works like reading the value itself.",
      hints: [
        { id: "h1", title: "The types", content: "use std::rc::Rc; struct Depot { name: String, docks: u32 } struct Courier { callsign: String, depot: Rc<Depot> } Put them above fn main." },
        { id: "h2", title: "Making and counting tickets", content: "let depot_info = Rc::new(Depot { name: \"Gull Quay\".to_string(), docks: 6 }); then Courier { callsign: \"Sparrow-41\".to_string(), depot: Rc::clone(&depot_info) }. Rc::strong_count(&depot_info) reads the count; Rc::ptr_eq(&a.depot, &b.depot) compares tickets." },
        { id: "h3", title: "The inner block and drop", content: "let count_inside; { let visitor = Courier { ... depot: Rc::clone(&depot_info) }; count_inside = Rc::strong_count(&depot_info); } The visitor dies at the closing brace. Then drop(courier_b); and read the count again." },
      ],
      tests: [
        {
          id: "t1",
          description: "The holder count follows the tickets",
          assertionCode: js`
assert(lines.includes("Holders after creating: 1"), 'No line is exactly "Holders after creating: 1". Rc::new starts the count at 1.');
assert(lines.includes("Holders with two couriers: 3"), 'No line is exactly "Holders with two couriers: 3". Give each courier depot: Rc::clone(&depot_info), then print Rc::strong_count(&depot_info).');
assert(lines.includes("Same depot behind both: true"), 'No line is exactly "Same depot behind both: true". Rc::ptr_eq(&courier_a.depot, &courier_b.depot) is true when both tickets lead to one depot.');`,
        },
        {
          id: "t2",
          description: "A scope and a drop change the count",
          assertionCode: js`
assert(lines.some((l) => l.startsWith("Holders inside the block: 4")), 'No line starts with "Holders inside the block: 4". Inside the { } block the visitor holds a fourth ticket.');
assert(lines.includes("Holders after the block: 3"), 'No line is exactly "Holders after the block: 3". The visitor was dropped at the closing brace.');
assert(lines.includes("Holders after Heron-42 retires: 2"), 'No line is exactly "Holders after Heron-42 retires: 2". Call drop(courier_b) and read Rc::strong_count again.');
assert(lines.includes("Sparrow-41 works from Gull Quay (6 docks)"), 'No line is exactly "Sparrow-41 works from Gull Quay (6 docks)". Read through the Rc: courier_a.depot.name and .docks.');`,
        },
        {
          id: "t3",
          description: "The board gets the depot and the count at each step",
          assertionCode: js`
const d = scene.depot;
assert(d && typeof d === "object", 'Send scene("depot", Json::new()...).');
assertEqual(d.name, "Gull Quay", '"name" should be "Gull Quay".');
assertEqual(d.docks, 6, '"docks" should be 6.');
assertEqual(d.holders, ["Sparrow-41", "Heron-42"], '"holders" should be ["Sparrow-41", "Heron-42"].');
assertEqual((d.steps || []).map((s) => s.count), [1, 3, 4, 3, 2], '"steps" counts should be 1, 3, 4, 3, 2.');`,
        },
      ],
      unlocks: ["df-depot"],
      checks: [
        {
          prompt: "What does `Rc::clone(&depot)` do?",
          question: {
            type: "choice",
            options: ["Copies the whole depot", "Makes another owner pointing at the same depot and adds one to the count", "Moves the depot out of the first owner", "Frees the depot"],
            answer: 1,
          },
          explanation: "Cloning an `Rc` is cheap: the data stays where it is; only the reference count changes.",
        },
        {
          prompt: "You write `courier.depot.docks = 7;` where `depot` is an `Rc<Depot>`. Which error code do you get?",
          question: { type: "text", answer: ["E0594", "e0594"] },
          explanation: "`E0594`: cannot assign to data in an `Rc`. Shared data is read-only; changing it needs interior mutability (next lesson).",
        },
      ],
    },
    // ───────────────────────── 14 ─────────────────────────
    {
      id: "rust-traits-14-refcell",
      title: "RefCell: change what everyone shares",
      minutes: 40,
      xp: 170,
      concepts: ["interior mutability", "RefCell", "Rc<RefCell<T>>", "borrow", "borrow_mut", "try_borrow_mut", "BorrowMutError", "runtime borrow check"],
      learn: md`### The shared notice that must be updated

The depot's ledger records every delivery: how many, and a line for each. All couriers write to it, and all of them hold the same \`Rc\`. Lesson 13 left us stuck: the thing behind an \`Rc\` is read-only. How can the *same* ledger be written by several owners?

First, why the rule exists. Rust's normal promise (from Reef Station) is: **at any moment either many readers or one writer, never both**. The compiler checks it while building. That is the best kind of check, because mistakes never reach the running program. But sometimes the compiler cannot prove an access pattern is safe even though *you* know it is, and with shared owners it can almost never see who is touching what.

### Interior mutability: move the check to run time

\`RefCell<T>\` is a box around a \`T\` that lets you change the contents **through a shared reference**. That trick is called **interior mutability**: the value is mutable on the inside, even though the outside looks read-only. The price is that the "many readers or one writer" rule is not checked by the compiler any more but **while the program runs**. A meeting-room booking sheet works like this: nobody stops you from taking the pen, but if two people try to book the same slot at once, someone is told no.

~~~rust
use std::cell::RefCell;

let tally = RefCell::new(vec![1, 2, 3]);
tally.borrow_mut().push(4);          // write access, for one statement
println!("{}", tally.borrow().len());  // read access: 4
~~~

- \`.borrow()\` hands out read access (a guard, \`Ref<T>\`).
- \`.borrow_mut()\` hands out write access (\`RefMut<T>\`).
- A guard is a normal value: while it lives, the access is held; when it is dropped (end of the statement, or end of its scope, or \`drop(guard)\`), the access is released.

### The famous combination: Rc<RefCell<T>>

Put the two together and you get shared, changeable state:

~~~rust
use std::cell::RefCell;
use std::rc::Rc;

struct Ledger { delivered: u32, entries: Vec<String> }

struct Runner {
    callsign: String,
    ledger: Rc<RefCell<Ledger>>,
}

impl Runner {
    fn deliver(&self, parcel: &Parcel) {                 // note: &self, not &mut self
        let mut ledger = self.ledger.borrow_mut();
        ledger.delivered += 1;
        ledger.entries.push(format!("{} delivered {}", self.callsign, parcel));
    }
}
~~~

\`Rc\` gives several owners; \`RefCell\` lets any of them change the contents. Look at \`deliver(&self ...)\`: the method only *looks* at the runner and still updates the ledger. That is interior mutability at work.

### When the rule is broken: a panic

Ask for write access while a read guard is alive, and Rust cannot refuse at build time, so it stops the program:

~~~rust
let reader = tally.borrow();
let mut writer = tally.borrow_mut();     // too late: a reader is still alive
~~~

~~~text
thread 'main' panicked at main.rs:5:28:
RefCell already borrowed
~~~

Asking in the opposite order ends with \`RefCell already mutably borrowed\`. Older Rust versions print these as \`already borrowed: BorrowMutError\` and \`already mutably borrowed: BorrowError\`: the same two mistakes. A **panic** is Rust's emergency stop: the program ends and prints where it happened. It is not memory-unsafe (nothing was corrupted), but it is a crash, so treat \`RefCell\` like a ticking sign: keep guards short.

There is a polite version of each method that returns a \`Result\` instead of panicking: \`try_borrow\` and \`try_borrow_mut\`. They are perfect for *seeing* the rule in action:

~~~rust
let reader = tally.borrow();
println!("{:?}", tally.try_borrow_mut());   // Err(BorrowMutError)
drop(reader);                               // the guard is released
println!("{}", tally.try_borrow_mut().is_ok());   // true
~~~

### Rules of thumb

- Prefer plain ownership and \`&mut\` whenever you can. Reach for \`Rc<RefCell<T>>\` when several owners truly need to change one thing.
- Hold a guard for as short a time as possible: let it end at the semicolon, or put it in a small block.
- Never call into other code that might touch the same \`RefCell\` while you hold a guard.

### Common mistakes

- Storing a \`borrow()\` in a variable and then calling \`borrow_mut()\` before it is gone.
- Forgetting that \`Rc<RefCell<T>>\` is one-thread only (its thread-safe cousin comes later in the path).
- Using \`RefCell\` to dodge a compiler error that was pointing at a real design problem.`,
      mission: md`Make the ledger. Two runners share one \`Rc<RefCell<Ledger>>\` and each records deliveries through a method that only takes \`&self\`. Then try the ledger's safety rule on purpose, politely, with \`try_borrow_mut\`, while a reader is watching and after it has left.

You will use the \`Parcel\` values from earlier lessons as the things delivered.`,
      tasks: [
        "Above the divider add use std::cell::RefCell;, struct Ledger { delivered: u32, entries: Vec<String> } and struct Runner { callsign: String, ledger: Rc<RefCell<Ledger>> } with fn deliver(&self, parcel: &Parcel) that uses self.ledger.borrow_mut() to add one to delivered and push format!(\"{} delivered {}\", self.callsign, parcel)",
        "In main make let ledger = Rc::new(RefCell::new(Ledger { delivered: 0, entries: Vec::new() })); and runner_a (\"Sparrow-51\") and runner_b (\"Heron-52\"), each with ledger: Rc::clone(&ledger)",
        "Deliver parcel (runner_a), converted (runner_b) and Parcel::from((22, 8)) (runner_a); print Deliveries logged: 3 (ledger.borrow().delivered) and then every entry on its own line",
        "Take a reader with let reader = ledger.borrow(); print Write while a reader is active: refused (try_borrow_mut().is_err()); drop(reader); then print Write after the reader is gone: allowed",
        "Print Strong count of the ledger: 3 and send scene(\"ledgerView\", ...) with delivered, entries, strongCount, whileReading (\"refused\") and afterReader (\"allowed\")",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: Rc<RefCell<T>>. Above main:
//   use std::cell::RefCell;      struct Ledger { delivered: u32, entries: Vec<String> }      struct Runner { callsign: String, ledger: Rc<RefCell<Ledger>> }
//   impl Runner { fn deliver(&self, parcel: &Parcel) { let mut ledger = self.ledger.borrow_mut(); delivered += 1; entries.push(format!("{} delivered {}", self.callsign, parcel)); } }
${MAIN_DIVIDER}
// let ledger = Rc::new(RefCell::new(Ledger { delivered: 0, entries: Vec::new() }));        runner_a = "Sparrow-51", runner_b = "Heron-52" (Rc::clone(&ledger))
// runner_a.deliver(&parcel);  runner_b.deliver(&converted);  runner_a.deliver(&Parcel::from((22, 8)));
// print  Deliveries logged: 3   then the three entries:  Sparrow-51 delivered #17 (3 kg, fragile) / Heron-52 delivered #21 (4 kg) / Sparrow-51 delivered #22 (8 kg)
// let reader = ledger.borrow();   print  Write while a reader is active: refused      drop(reader);   print  Write after the reader is gone: allowed
// print  Strong count of the ledger: 3      scene("ledgerView", Json::new().with("delivered", ..).with("entries", ..).with("strongCount", ..).with("whileReading", "refused").with("afterReader", "allowed"));
`,
      solutionAdd: rs`use std::cell::RefCell;

struct Ledger {
    delivered: u32,
    entries: Vec<String>,
}

struct Runner {
    callsign: String,
    ledger: Rc<RefCell<Ledger>>,
}

impl Runner {
    fn deliver(&self, parcel: &Parcel) {
        let mut ledger = self.ledger.borrow_mut();
        ledger.delivered += 1;
        ledger.entries.push(format!("{} delivered {}", self.callsign, parcel));
    }
}
${MAIN_DIVIDER}
// Lesson 14: a ledger everybody shares and everybody can write.
let ledger = Rc::new(RefCell::new(Ledger { delivered: 0, entries: Vec::new() }));
let runner_a = Runner { callsign: "Sparrow-51".to_string(), ledger: Rc::clone(&ledger) };
let runner_b = Runner { callsign: "Heron-52".to_string(), ledger: Rc::clone(&ledger) };

runner_a.deliver(&parcel);
runner_b.deliver(&converted);
runner_a.deliver(&Parcel::from((22, 8)));

println!("Deliveries logged: {}", ledger.borrow().delivered);
for entry in ledger.borrow().entries.iter() {
    println!("{}", entry);
}

let reader = ledger.borrow();
let refused = ledger.try_borrow_mut().is_err();
println!("Write while a reader is active: {}", if refused { "refused" } else { "allowed" });
drop(reader);
let allowed = ledger.try_borrow_mut().is_ok();
println!("Write after the reader is gone: {}", if allowed { "allowed" } else { "refused" });

let ledger_holders = Rc::strong_count(&ledger);
println!("Strong count of the ledger: {}", ledger_holders);

scene(
    "ledgerView",
    Json::new()
        .with("delivered", ledger.borrow().delivered)
        .with("entries", &ledger.borrow().entries)
        .with("strongCount", ledger_holders)
        .with("whileReading", if refused { "refused" } else { "allowed" })
        .with("afterReader", if allowed { "allowed" } else { "refused" }),
);`,
      explanation:
        "Rc lets both runners own the ledger and RefCell lets either change it, even though deliver only takes &self (interior mutability). The usual borrow rule (many readers or one writer) is now checked at run time: while reader is alive, try_borrow_mut returns Err instead of giving write access, and after drop(reader) it succeeds. Calling borrow_mut() instead of try_borrow_mut() in that situation would panic with 'RefCell already borrowed'. The strong count is 3: the ledger variable plus one Rc inside each runner.",
      hints: [
        { id: "h1", title: "The shared ledger types", content: "use std::cell::RefCell; struct Ledger { delivered: u32, entries: Vec<String> } struct Runner { callsign: String, ledger: Rc<RefCell<Ledger>> } (Rc is already imported from lesson 13.)" },
        { id: "h2", title: "deliver takes &self", content: "impl Runner { fn deliver(&self, parcel: &Parcel) { let mut ledger = self.ledger.borrow_mut(); ledger.delivered += 1; ledger.entries.push(format!(\"{} delivered {}\", self.callsign, parcel)); } } The guard ends when the function ends." },
        { id: "h3", title: "The polite check", content: "let reader = ledger.borrow(); let refused = ledger.try_borrow_mut().is_err(); ... drop(reader); let allowed = ledger.try_borrow_mut().is_ok(); try_borrow_mut returns a Result, so no panic." },
      ],
      tests: [
        {
          id: "t1",
          description: "Two runners write to one shared ledger",
          assertionCode: js`
assert(lines.includes("Deliveries logged: 3"), 'No line is exactly "Deliveries logged: 3". Both runners call deliver, which uses self.ledger.borrow_mut() to add one each time.');
assert(lines.includes("Sparrow-51 delivered #17 (3 kg, fragile)") && lines.includes("Heron-52 delivered #21 (4 kg)") && lines.includes("Sparrow-51 delivered #22 (8 kg)"), 'The three entries should be printed one per line: "Sparrow-51 delivered #17 (3 kg, fragile)", "Heron-52 delivered #21 (4 kg)", "Sparrow-51 delivered #22 (8 kg)".');`,
        },
        {
          id: "t2",
          description: "The runtime borrow check refuses a writer while a reader lives",
          assertionCode: js`
assert(lines.includes("Write while a reader is active: refused"), 'No line is exactly "Write while a reader is active: refused". Keep let reader = ledger.borrow(); alive and test ledger.try_borrow_mut().is_err().');
assert(lines.includes("Write after the reader is gone: allowed"), 'No line is exactly "Write after the reader is gone: allowed". drop(reader) first, then ledger.try_borrow_mut().is_ok().');
assert(lines.includes("Strong count of the ledger: 3"), 'No line is exactly "Strong count of the ledger: 3". The ledger variable plus one Rc inside each runner makes three.');`,
        },
        {
          id: "t3",
          description: "The board gets the ledger view",
          assertionCode: js`
const v = scene.ledgerView;
assert(v && typeof v === "object", 'Send scene("ledgerView", Json::new()...).');
assertEqual(v.delivered, 3, '"delivered" should be 3.');
assert(Array.isArray(v.entries) && v.entries.length === 3, '"entries" should hold the three ledger lines.');
assertEqual(v.strongCount, 3, '"strongCount" should be 3.');
assertEqual([v.whileReading, v.afterReader], ["refused", "allowed"], '"whileReading" should be "refused" and "afterReader" "allowed".');`,
        },
      ],
      unlocks: ["df-ledger"],
      checks: [
        {
          prompt: "What is 'interior mutability'?",
          question: {
            type: "choice",
            options: ["Changing a value through a shared reference, with the borrow rules checked while the program runs", "Making every variable mutable", "Using unsafe code", "Mutating inside a closure only"],
            answer: 0,
          },
          explanation: "`RefCell` lets you change the contents behind `&self`. It trades the compile-time guarantee for a run-time check.",
        },
        {
          prompt: "You call `borrow_mut()` while a `borrow()` guard from the same RefCell is still alive. What happens?",
          question: {
            type: "choice",
            options: ["It compiles but silently corrupts data", "The program panics: RefCell already borrowed", "The compiler reports E0382", "The new borrow waits until the reader finishes"],
            answer: 1,
          },
          explanation: "The rule 'many readers or one writer' is enforced at run time, and breaking it panics (older Rust: `already borrowed: BorrowMutError`). `try_borrow_mut` returns an `Err` instead.",
        },
      ],
    },
    // ───────────────────────── 15 ─────────────────────────
    {
      id: "rust-traits-15-assoc",
      title: "Associated types and constants",
      minutes: 35,
      xp: 150,
      concepts: ["associated const", "associated type", "R::SLOTS", "R::Cargo", "bounds on associated types", "E0046", "E0191", "E0277"],
      learn: md`### Every rig has rules of its own

Drones carry their load in a **rig**: a post pouch for letters, a crate rack for parcels. Each rig has a fixed number of slots and a kind of cargo, and the dispatcher wants one function that works for any rig and still knows those rules. Some rules are *values* (number of slots), others are *types* (what a slot holds). Traits can carry both. You have already used one of each: \`type Output\` in lesson 9 and \`type Item\` in lesson 11.

### Associated constants: values that belong to the type

~~~rust
trait Rig {
    const SLOTS: usize;            // a number every rig must state
    const LABEL: &'static str;     // and a name
    type Cargo;                    // the kind of thing in a slot
    fn cargo(&self) -> Vec<Self::Cargo>;
}
~~~

An **associated constant** is a value attached to the *type*, not to one object: a rig of this kind has 8 slots, whichever pouch you hold. Each impl fills in the blanks:

~~~rust
struct PostPouch { letters: Vec<u32> }          // letter numbers

impl Rig for PostPouch {
    const SLOTS: usize = 8;
    const LABEL: &'static str = "post pouch";
    type Cargo = u32;
    fn cargo(&self) -> Vec<u32> { self.letters.clone() }
}
~~~

You read a constant with the type's name: \`PostPouch::SLOTS\`, and inside a generic function with the type parameter's name: \`R::SLOTS\`. (\`&'static str\` is "text that lives for the whole program", the type of a string literal.) Leave one out and you meet \`E0046\` once more ("not all trait items implemented, missing: \`SLOTS\`").

### Associated types: why not just a type parameter?

Compare two traits you know. \`Mul<i32>\` has a type **parameter**: one \`Pos\` can multiply with many things (\`Mul<i32>\`, \`Mul<f64>\`, ...), so the caller must say which. \`Iterator\` has an associated **type**: any given iterator produces exactly one kind of item, so there is nothing to choose, and every signature that uses it stays short. \`Rig\` is the second kind: one rig, one cargo type.

~~~rust
struct CrateRack { crates: Vec<Parcel> }

impl Rig for CrateRack {
    const SLOTS: usize = 3;
    const LABEL: &'static str = "crate rack";
    type Cargo = Parcel;
    fn cargo(&self) -> Vec<Parcel> { self.crates.clone() }
}
~~~

Now the generic function, using both kinds of item:

~~~rust
fn fill_report<R: Rig>(rig: &R) -> String {
    format!("{}: {} of {} slots", R::LABEL, rig.cargo().len(), R::SLOTS)
}
~~~

\`R::Cargo\` names "the cargo type of whichever rig R is". Because we know nothing else about it, we may not print it. Try:

~~~text
error[E0277]: \`<R as Rig>::Cargo\` doesn't implement \`std::fmt::Display\`
  |         Some(item) => format!("first: {}", item),
  |                                       --   ^^^^ \`<R as Rig>::Cargo\` cannot be formatted with the default formatter
help: consider further restricting the associated type
  | fn first_item<R: Rig>(rig: &R) -> String where <R as Rig>::Cargo: std::fmt::Display {
~~~

The compiler hands you the cure: put a **bound on the associated type**, in a \`where\` clause:

~~~rust
fn first_item<R: Rig>(rig: &R) -> String
where
    R::Cargo: fmt::Display,
{
    match rig.cargo().first() {
        Some(item) => format!("first: {}", item),
        None => "first: nothing".to_string(),
    }
}
~~~

It reads "R is a Rig, and whatever its Cargo is, that cargo can be displayed". \`u32\` and your \`Parcel\` (from lesson 7) both qualify, so both rigs work.

### One more rule: you must name the type to use dyn

A trait with an associated type cannot be turned into a trait object without saying what the type is:

~~~text
error[E0191]: the value of the associated type \`Cargo\` in \`Source\` must be specified
  |     let v: Vec<Box<dyn Source>> = Vec::new();
help: specify the associated type
  |     let v: Vec<Box<dyn Source<Cargo = /* Type */>>> = Vec::new();
~~~

(And a trait with an associated *constant* is not dyn-compatible at all, so \`Rig\` stays a generic-only trait. That is a fine place to use generics.)

### Common mistakes

- Reading \`Rig::SLOTS\` instead of \`PostPouch::SLOTS\` or \`R::SLOTS\`: the constant needs to know which type.
- Printing an \`R::Cargo\` without a \`where R::Cargo: Display\` bound (E0277).
- Using an associated type where the trait really needs a type parameter, and vice versa: ask "can one type implement this trait several times with different types?" If yes, use a parameter.`,
      mission: md`Two rigs hang under the drones: the **post pouch** (8 slots, letters numbered 101, 102, 103) and the **crate rack** (3 slots, holding the parcels \`parcel\` and \`converted\` from earlier). Write one trait that states each rig's slot count, label and cargo type, and two generic reports that work for both.

The board draws each rig as a row of slots.`,
      tasks: [
        "Above the divider write trait Rig { const SLOTS: usize; const LABEL: &'static str; type Cargo; fn cargo(&self) -> Vec<Self::Cargo>; } and struct PostPouch { letters: Vec<u32> } and struct CrateRack { crates: Vec<Parcel> }",
        "impl Rig for PostPouch (8 slots, \"post pouch\", Cargo = u32) and for CrateRack (3 slots, \"crate rack\", Cargo = Parcel); cargo returns a clone of the Vec",
        "Write fn fill_report<R: Rig>(rig: &R) -> String giving post pouch: 3 of 8 slots (R::LABEL, rig.cargo().len(), R::SLOTS) and fn first_item<R: Rig>(rig: &R) -> String with where R::Cargo: fmt::Display returning first: 101 (or first: nothing for an empty rig)",
        "In main make pouch (letters 101, 102, 103) and rack (parcel.clone(), converted.clone()) and print fill_report and first_item for both, then Total slots: 11 using PostPouch::SLOTS + CrateRack::SLOTS",
        "Send scene(\"rigs\", ...): two records with label, used, slots and first (the first_item text without the first: prefix is fine to send as the whole text)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: associated types and constants. Above main:
//   trait Rig { const SLOTS: usize; const LABEL: &'static str; type Cargo; fn cargo(&self) -> Vec<Self::Cargo>; }
//   struct PostPouch { letters: Vec<u32> }     struct CrateRack { crates: Vec<Parcel> }
//   impl Rig for PostPouch (8, "post pouch", Cargo = u32)     impl Rig for CrateRack (3, "crate rack", Cargo = Parcel)
//   fn fill_report<R: Rig>(rig: &R) -> String          "post pouch: 3 of 8 slots"
//   fn first_item<R: Rig>(rig: &R) -> String where R::Cargo: fmt::Display      "first: 101"  or "first: nothing"
${MAIN_DIVIDER}
// let pouch = PostPouch { letters: vec![101, 102, 103] };     let rack = CrateRack { crates: vec![parcel.clone(), converted.clone()] };
// print  post pouch: 3 of 8 slots / first: 101 / crate rack: 2 of 3 slots / first: #17 (3 kg, fragile) / Total slots: 11
// scene("rigs", vec![ Json::new().with("label", PostPouch::LABEL).with("used", ..).with("slots", PostPouch::SLOTS).with("first", ..), ... ]);
`,
      solutionAdd: rs`trait Rig {
    const SLOTS: usize;
    const LABEL: &'static str;
    type Cargo;
    fn cargo(&self) -> Vec<Self::Cargo>;
}

struct PostPouch {
    letters: Vec<u32>,
}

struct CrateRack {
    crates: Vec<Parcel>,
}

impl Rig for PostPouch {
    const SLOTS: usize = 8;
    const LABEL: &'static str = "post pouch";
    type Cargo = u32;
    fn cargo(&self) -> Vec<u32> {
        self.letters.clone()
    }
}

impl Rig for CrateRack {
    const SLOTS: usize = 3;
    const LABEL: &'static str = "crate rack";
    type Cargo = Parcel;
    fn cargo(&self) -> Vec<Parcel> {
        self.crates.clone()
    }
}

fn fill_report<R: Rig>(rig: &R) -> String {
    format!("{}: {} of {} slots", R::LABEL, rig.cargo().len(), R::SLOTS)
}

fn first_item<R: Rig>(rig: &R) -> String
where
    R::Cargo: fmt::Display,
{
    match rig.cargo().first() {
        Some(item) => format!("first: {}", item),
        None => "first: nothing".to_string(),
    }
}
${MAIN_DIVIDER}
// Lesson 15: the rules of each rig.
let pouch = PostPouch { letters: vec![101, 102, 103] };
let rack = CrateRack { crates: vec![parcel.clone(), converted.clone()] };

let pouch_report = fill_report(&pouch);
let pouch_first = first_item(&pouch);
let rack_report = fill_report(&rack);
let rack_first = first_item(&rack);
println!("{}", pouch_report);
println!("{}", pouch_first);
println!("{}", rack_report);
println!("{}", rack_first);
println!("Total slots: {}", PostPouch::SLOTS + CrateRack::SLOTS);

scene(
    "rigs",
    vec![
        Json::new().with("label", PostPouch::LABEL).with("used", pouch.cargo().len()).with("slots", PostPouch::SLOTS).with("first", pouch_first),
        Json::new().with("label", CrateRack::LABEL).with("used", rack.cargo().len()).with("slots", CrateRack::SLOTS).with("first", rack_first),
    ],
);`,
      explanation:
        "Rig states its rules as associated items: two constants (SLOTS, LABEL) that every impl must give a value, and an associated type Cargo that every impl must name. Generic code reads constants as R::SLOTS and the type as R::Cargo. first_item prints a cargo item, so it needs the bound where R::Cargo: fmt::Display, which both u32 and Parcel satisfy. Because one rig has exactly one cargo type, an associated type fits better than a type parameter.",
      hints: [
        { id: "h1", title: "The trait", content: "trait Rig { const SLOTS: usize; const LABEL: &'static str; type Cargo; fn cargo(&self) -> Vec<Self::Cargo>; } and the two structs: PostPouch { letters: Vec<u32> }, CrateRack { crates: Vec<Parcel> }." },
        { id: "h2", title: "The impls", content: "impl Rig for PostPouch { const SLOTS: usize = 8; const LABEL: &'static str = \"post pouch\"; type Cargo = u32; fn cargo(&self) -> Vec<u32> { self.letters.clone() } } and the CrateRack with 3, \"crate rack\" and Cargo = Parcel." },
        { id: "h3", title: "The generic functions", content: "fn fill_report<R: Rig>(rig: &R) -> String { format!(\"{}: {} of {} slots\", R::LABEL, rig.cargo().len(), R::SLOTS) } and first_item with a where clause: where R::Cargo: fmt::Display, using rig.cargo().first() in a match." },
      ],
      tests: [
        {
          id: "t1",
          description: "One generic report reads each rig's constants",
          assertionCode: js`
assert(lines.includes("post pouch: 3 of 8 slots"), 'No line is exactly "post pouch: 3 of 8 slots". fill_report uses R::LABEL, rig.cargo().len() and R::SLOTS.');
assert(lines.includes("crate rack: 2 of 3 slots"), 'No line is exactly "crate rack: 2 of 3 slots". The crate rack has SLOTS = 3 and holds two parcels.');
assert(lines.includes("Total slots: 11"), 'No line is exactly "Total slots: 11". Add PostPouch::SLOTS + CrateRack::SLOTS (8 + 3).');`,
        },
        {
          id: "t2",
          description: "The associated type must be displayable",
          assertionCode: js`
assert(lines.includes("first: 101"), 'No line is exactly "first: 101". first_item works for the pouch because Cargo = u32 implements Display.');
assert(lines.includes("first: #17 (3 kg, fragile)"), 'No line is exactly "first: #17 (3 kg, fragile)". The crate rack\'s Cargo is Parcel, which has your Display impl; first_item needs where R::Cargo: fmt::Display.');`,
        },
        {
          id: "t3",
          description: "The board draws both rigs",
          assertionCode: js`
const r = scene.rigs;
assert(Array.isArray(r) && r.length === 2, 'Send scene("rigs", vec![...]) with two records, the pouch then the rack.');
assertEqual(r.map((x) => x.label), ["post pouch", "crate rack"], 'The labels should be "post pouch" and "crate rack" (from the constants).');
assertEqual(r.map((x) => x.used), [3, 2], '"used" should be 3 and 2.');
assertEqual(r.map((x) => x.slots), [8, 3], '"slots" should be 8 and 3.');`,
        },
      ],
      unlocks: ["df-rigs"],
      checks: [
        {
          prompt: "Inside a generic function `fn f<R: Rig>(rig: &R)`, how do you read the associated constant `SLOTS`?",
          question: { type: "text", answer: ["R::SLOTS", "R::SLOTS;", "R::SLOTS "] },
          explanation: "A constant belongs to a type, so you name the type: `R::SLOTS` in generic code, `PostPouch::SLOTS` in concrete code.",
        },
        {
          prompt: "When is an associated type a better fit than a trait type parameter like `Mul<i32>`?",
          question: {
            type: "choice",
            options: ["When one implementing type has exactly one natural answer (an iterator has one Item type)", "When you want the trait to be slower", "When the type has no methods", "Never; they are identical"],
            answer: 0,
          },
          explanation: "A parameter lets one type implement the trait several times with different types (`Pos * i32`, `Pos * f64`). An associated type fixes one answer per implementing type, which keeps signatures short.",
        },
      ],
    },
    // ───────────────────────── 16 ─────────────────────────
    {
      id: "rust-traits-16-dispatch-day",
      title: "Dispatch day",
      minutes: 50,
      xp: 220,
      concepts: ["trait with required and default methods", "Box<dyn Worker>", "Rc<RefCell<T>>", "Ord for jobs", "From", "? on Option", "capstone"],
      learn: md`### Everything in one working day

Today the pieces meet. A real dispatch day needs a shared board of waiting jobs (**\`Rc<RefCell<..>>\`**, lessons 13 and 14), runners of different kinds (**trait objects**, lessons 5 and 6) that all do the same daily routine written once (**a default method**, lesson 2), and a rule for which job to take first (**\`Ord\`**, lesson 10). Nothing in this lesson is new except one small tool and the way the ideas fit together.

### The plan

~~~text
shelf (Rc<RefCell<Shelf>>)  <----  LightRunner   (carries up to 2 kg)
 - waiting jobs, sorted             HeavyRunner   (carries up to 12 kg)
 - delivered jobs                   both are stored as Box<dyn Worker>
 - a log of what happened
~~~

The **Worker** trait states what a runner must provide, and one default method, \`work\`, does the daily routine on top of it:

~~~rust
trait Worker {
    fn name(&self) -> String;
    fn max_kg(&self) -> u32;
    fn shelf(&self) -> &Rc<RefCell<Shelf>>;
    fn note_delivery(&mut self);
    fn deliveries(&self) -> u32;

    fn work(&mut self) -> Option<String> {
        let limit = self.max_kg();
        let job = {
            let mut shelf = self.shelf().borrow_mut();
            let at = shelf.waiting.iter().position(|j| j.weight_kg <= limit)?;
            let job = shelf.waiting.remove(at);
            shelf.delivered.push(job.clone());
            job
        };
        self.note_delivery();
        let line = format!("{} delivers {} [{:?}]", self.name(), job, job.urgency);
        self.shelf().borrow_mut().log.push(line.clone());
        Some(line)
    }
}
~~~

Walk through it slowly:

- Five required methods describe *what a runner is*. \`work\` is a **default method**: every runner gets it without writing it, and it uses the required methods, exactly like \`can_lift\` used \`capacity_kg\` in lesson 2.
- \`self.shelf().borrow_mut()\` takes write access to the shared shelf. The braces \`{ ... }\` around that part are deliberate: the guard (lesson 14) is dropped at the closing brace, **before** the second \`borrow_mut()\` that appends to the log. Keep guards short.
- \`.position(|j| ...)\` returns the index of the first waiting job the runner can carry, as an \`Option<usize>\`. The \`?\` at the end of that line is the question-mark you know from Corvid Peak, and it works on \`Option\` too: if the value is \`None\`, the whole function returns \`None\` right there ("nothing to do"); if it is \`Some(x)\`, you continue with \`x\`.
- The shelf is kept **sorted**, so "the first job that fits" means "the most urgent job that fits".

### The day's loop

~~~rust
let mut crew: Vec<Box<dyn Worker>> = vec![ /* a LightRunner and a HeavyRunner */ ];
loop {
    let mut busy = false;
    for runner in crew.iter_mut() {
        if let Some(line) = runner.work() {
            println!("{}", line);
            busy = true;
        }
    }
    if !busy { break; }
}
~~~

\`iter_mut()\` gives mutable access to each boxed runner, \`runner.work()\` is a dynamic call through the vtable, and the loop stops when a whole round passes with nobody finding a job. Parcels too heavy for every runner simply stay on the shelf.

### Given to you

The starter hands over the job card (\`Job\`, with the ordering, conversion and Display code written in the style of earlier lessons), the \`Shelf\` and the two runner structs. You write the trait, its two impls and the day itself.

### Common mistakes

- Holding the first \`borrow_mut()\` guard while calling something that borrows again: a run-time panic. The inner braces prevent it.
- Cloning the whole \`Rc<RefCell<..>>\` contents instead of cloning the \`Rc\`.
- Writing \`work\` twice, once per runner. A default method exists to avoid exactly that.`,
      mission: md`Close the book on Skerry Post's day. Six jobs are waiting on the depot shelf; two runners work the shelf in turns, each taking the most urgent job they can carry; one job is too heavy for anybody.

Run the day, print what happened, and let the board's final panel show the whole fleet at once.`,
      tasks: [
        "Above the divider write trait Worker with the five required methods (name, max_kg, shelf, note_delivery, deliveries) and the default method work shown in the lesson",
        "impl Worker for LightRunner (max 2 kg) and for HeavyRunner (max 12 kg): name clones the callsign, shelf returns &self.shelf, note_delivery adds one to done, deliveries returns done",
        "In main build let shelf = Rc::new(RefCell::new(Shelf { waiting: Vec::new(), delivered: Vec::new(), log: Vec::new() })); push Job::from((id, weight, urgency)) for 101 1 Standard, 102 9 Rush, 103 2 Economy, 104 2 Rush, 105 15 Standard, 106 1 Rush, then sort shelf.borrow_mut().waiting",
        "Make let mut crew: Vec<Box<dyn Worker>> with LightRunner \"Sparrow-61\" and HeavyRunner \"Heron-62\" (each with shelf: Rc::clone(&shelf), done: 0) and run the loop from the lesson, printing each line returned by work",
        "Print Delivered 5 of 6 jobs, Delivered weight: 15 kg (sum over shelf.borrow().delivered), Deliveries per runner: Sparrow-61 3, Heron-62 2, Left on the shelf: #105 (15 kg) and Shelf holders: 3",
        "Send scene(\"dispatchDay\", ...) with log (the printed lines), delivered, total, deliveredKg, left (the leftover jobs as text), runners (records with name and deliveries) and holders",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: dispatch day. The job card, the shelf and the runner structs are given (they use what you wrote before).
// You write above main:  trait Worker { name, max_kg, shelf, note_delivery, deliveries + the default method work() from the lesson }
//                        impl Worker for LightRunner (max 2 kg) and for HeavyRunner (max 12 kg)

${DISPATCH_GIVEN}
${MAIN_DIVIDER}
// let shelf = Rc::new(RefCell::new(Shelf { waiting: Vec::new(), delivered: Vec::new(), log: Vec::new() }));
// for spec in [(101, 1, Urgency::Standard), (102, 9, Urgency::Rush), (103, 2, Urgency::Economy), (104, 2, Urgency::Rush), (105, 15, Urgency::Standard), (106, 1, Urgency::Rush)] { shelf.borrow_mut().waiting.push(Job::from(spec)); }
// shelf.borrow_mut().waiting.sort();
// let mut crew: Vec<Box<dyn Worker>> = vec![ LightRunner "Sparrow-61", HeavyRunner "Heron-62" ];      loop { ... runner.work() ... }
// print the delivery lines, then:  Delivered 5 of 6 jobs / Delivered weight: 15 kg / Deliveries per runner: Sparrow-61 3, Heron-62 2 / Left on the shelf: #105 (15 kg) / Shelf holders: 3
// scene("dispatchDay", Json::new().with("log", ..).with("delivered", ..).with("total", 6u32).with("deliveredKg", ..).with("left", ..).with("runners", ..).with("holders", ..));
`,
      solutionAdd: rs`${DISPATCH_GIVEN}

trait Worker {
    fn name(&self) -> String;
    fn max_kg(&self) -> u32;
    fn shelf(&self) -> &Rc<RefCell<Shelf>>;
    fn note_delivery(&mut self);
    fn deliveries(&self) -> u32;

    fn work(&mut self) -> Option<String> {
        let limit = self.max_kg();
        let job = {
            let mut shelf = self.shelf().borrow_mut();
            let at = shelf.waiting.iter().position(|j| j.weight_kg <= limit)?;
            let job = shelf.waiting.remove(at);
            shelf.delivered.push(job.clone());
            job
        };
        self.note_delivery();
        let line = format!("{} delivers {} [{:?}]", self.name(), job, job.urgency);
        self.shelf().borrow_mut().log.push(line.clone());
        Some(line)
    }
}

impl Worker for LightRunner {
    fn name(&self) -> String {
        self.callsign.clone()
    }
    fn max_kg(&self) -> u32 {
        2
    }
    fn shelf(&self) -> &Rc<RefCell<Shelf>> {
        &self.shelf
    }
    fn note_delivery(&mut self) {
        self.done += 1;
    }
    fn deliveries(&self) -> u32 {
        self.done
    }
}

impl Worker for HeavyRunner {
    fn name(&self) -> String {
        self.callsign.clone()
    }
    fn max_kg(&self) -> u32 {
        12
    }
    fn shelf(&self) -> &Rc<RefCell<Shelf>> {
        &self.shelf
    }
    fn note_delivery(&mut self) {
        self.done += 1;
    }
    fn deliveries(&self) -> u32 {
        self.done
    }
}
${MAIN_DIVIDER}
// Lesson 16: a whole dispatch day.
let shelf = Rc::new(RefCell::new(Shelf { waiting: Vec::new(), delivered: Vec::new(), log: Vec::new() }));
for spec in [
    (101, 1, Urgency::Standard),
    (102, 9, Urgency::Rush),
    (103, 2, Urgency::Economy),
    (104, 2, Urgency::Rush),
    (105, 15, Urgency::Standard),
    (106, 1, Urgency::Rush),
] {
    shelf.borrow_mut().waiting.push(Job::from(spec));
}
shelf.borrow_mut().waiting.sort();

let mut crew: Vec<Box<dyn Worker>> = vec![
    Box::new(LightRunner { callsign: "Sparrow-61".to_string(), shelf: Rc::clone(&shelf), done: 0 }),
    Box::new(HeavyRunner { callsign: "Heron-62".to_string(), shelf: Rc::clone(&shelf), done: 0 }),
];

loop {
    let mut busy = false;
    for runner in crew.iter_mut() {
        if let Some(line) = runner.work() {
            println!("{}", line);
            busy = true;
        }
    }
    if !busy {
        break;
    }
}

let delivered_count = shelf.borrow().delivered.len();
let delivered_kg: u32 = shelf.borrow().delivered.iter().map(|j| j.weight_kg).sum();
println!("Delivered {} of 6 jobs", delivered_count);
println!("Delivered weight: {} kg", delivered_kg);
let per_runner: Vec<String> = crew.iter().map(|r| format!("{} {}", r.name(), r.deliveries())).collect();
println!("Deliveries per runner: {}", per_runner.join(", "));
let left: Vec<String> = shelf.borrow().waiting.iter().map(|j| j.to_string()).collect();
println!("Left on the shelf: {}", left.join(", "));
let shelf_holders = Rc::strong_count(&shelf);
println!("Shelf holders: {}", shelf_holders);

let runner_cards: Vec<Json> = crew
    .iter()
    .map(|r| Json::new().with("name", r.name()).with("deliveries", r.deliveries()))
    .collect();
scene(
    "dispatchDay",
    Json::new()
        .with("log", &shelf.borrow().log)
        .with("delivered", delivered_count)
        .with("total", 6u32)
        .with("deliveredKg", delivered_kg)
        .with("left", &left)
        .with("runners", runner_cards)
        .with("holders", shelf_holders),
);`,
      explanation:
        "Worker lists what a runner must provide and gives every runner the same daily routine as a default method, work. The shelf is shared with Rc<RefCell<Shelf>>, each guard from borrow_mut() ends before the next one starts, and ? on the Option returns None when no waiting job fits. The crew is a Vec<Box<dyn Worker>> of two different runner types, called through the vtable. Jobs are kept sorted by your Ord (urgent first), so each runner takes the most urgent job it can carry; job 105 (15 kg) is too heavy for both and stays on the shelf.",
      hints: [
        { id: "h1", title: "The trait", content: "Copy the Worker trait from the lesson: five required methods and the default work() with the inner { } block around the first borrow_mut(). Everything the default body calls (max_kg, shelf, note_delivery, name) must be a method of the trait." },
        { id: "h2", title: "The two impls", content: "impl Worker for LightRunner { fn name(&self) -> String { self.callsign.clone() } fn max_kg(&self) -> u32 { 2 } fn shelf(&self) -> &Rc<RefCell<Shelf>> { &self.shelf } fn note_delivery(&mut self) { self.done += 1; } fn deliveries(&self) -> u32 { self.done } } The HeavyRunner is the same with max_kg 12." },
        { id: "h3", title: "The day", content: "Push Job::from((id, weight, urgency)) for each spec into shelf.borrow_mut().waiting, then shelf.borrow_mut().waiting.sort(). Build the crew as Vec<Box<dyn Worker>> and loop over crew.iter_mut() calling runner.work() until a full round finds nothing." },
      ],
      tests: [
        {
          id: "t1",
          description: "The runners take the most urgent job they can carry",
          assertionCode: js`
const expected = [
  "Sparrow-61 delivers #104 (2 kg) [Rush]",
  "Heron-62 delivers #102 (9 kg) [Rush]",
  "Sparrow-61 delivers #106 (1 kg) [Rush]",
  "Heron-62 delivers #101 (1 kg) [Standard]",
  "Sparrow-61 delivers #103 (2 kg) [Economy]",
];
const got = lines.filter((l) => l.includes(" delivers #"));
assertEqual(got, expected, "The delivery lines are wrong. Keep the shelf sorted (Rush first, then by id), let each runner take the first waiting job it can carry, and print each line work() returns, in turn order.");`,
        },
        {
          id: "t2",
          description: "The day's report is correct",
          assertionCode: js`
assert(lines.includes("Delivered 5 of 6 jobs"), 'No line is exactly "Delivered 5 of 6 jobs". Count shelf.borrow().delivered.len().');
assert(lines.includes("Delivered weight: 15 kg"), 'No line is exactly "Delivered weight: 15 kg". Sum weight_kg over the delivered jobs (2 + 9 + 1 + 1 + 2).');
assert(lines.includes("Deliveries per runner: Sparrow-61 3, Heron-62 2"), 'No line is exactly "Deliveries per runner: Sparrow-61 3, Heron-62 2". Use name() and deliveries() through the Box<dyn Worker>.');
assert(lines.includes("Left on the shelf: #105 (15 kg)"), 'No line is exactly "Left on the shelf: #105 (15 kg)". Job 105 weighs 15 kg and neither runner can carry it.');
assert(lines.includes("Shelf holders: 3"), 'No line is exactly "Shelf holders: 3". The shelf variable plus one Rc in each runner.');`,
        },
        {
          id: "t3",
          description: "The board receives the finished day",
          assertionCode: js`
const d = scene.dispatchDay;
assert(d && typeof d === "object", 'Send scene("dispatchDay", Json::new()...).');
assert(Array.isArray(d.log) && d.log.length === 5, '"log" should hold the five delivery lines (shelf.borrow().log).');
assertEqual([d.delivered, d.total, d.deliveredKg, d.holders], [5, 6, 15, 3], '"delivered", "total", "deliveredKg" and "holders" should be 5, 6, 15 and 3.');
assertEqual(d.left, ["#105 (15 kg)"], '"left" should list the jobs still waiting.');
assertEqual((d.runners || []).map((r) => [r.name, r.deliveries]), [["Sparrow-61", 3], ["Heron-62", 2]], '"runners" should hold name and deliveries for each runner.');`,
        },
      ],
      unlocks: ["df-board"],
      checks: [
        {
          prompt: "Why is the first `borrow_mut()` in `work` wrapped in its own `{ }` block?",
          question: {
            type: "choice",
            options: ["Blocks are required around borrow_mut", "So the guard is dropped before the second borrow_mut() that appends to the log; two live write guards would panic", "To make the code run faster", "Because of the ? operator"],
            answer: 1,
          },
          explanation: "A `RefMut` guard lives until the end of its scope. Ending the scope early releases the access, so the next `borrow_mut()` succeeds.",
        },
        {
          prompt: "Which ideas does a `Vec<Box<dyn Worker>>` of runners that share an `Rc<RefCell<Shelf>>` combine?",
          question: {
            type: "choice",
            options: ["Trait objects (different runner types in one list) and shared mutable state", "Only generics", "Only operator overloading", "Only iterators"],
            answer: 0,
          },
          explanation: "`Box<dyn Worker>` lets different runner types live in one list; `Rc<RefCell<..>>` lets all of them share and change one shelf.",
        },
      ],
    },
  ],
};
