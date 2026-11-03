import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 1: What can it do? Traits (defining, implementing, default methods), generics with bounds,
 * where clauses and impl Trait.
 *
 * Lesson 1's starter carries the skeleton: the three drone structs above `fn main()`. From lesson 2 on a
 * lesson's text may hold MAIN_DIVIDER: what is above it goes before `fn main()`, what is below it joins
 * main's body. The scene helper (scene, Json) is the project's hidden prelude (toolkit.ts).
 */

export const chapter1: Chapter = {
  id: "what-can-it-do",
  title: "What can it do?",
  blurb: "Skerry Post flies three kinds of drone. Teach Rust to ask what a thing can do instead of what it is: traits, default methods, generics and bounds.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "rust-traits-1-abilities",
      title: "A trait is a list of abilities",
      minutes: 35,
      xp: 120,
      concepts: ["trait", "impl Trait for Type", "&self", "method call", "E0046", "E0599", "E0053"],
      learn: md`### Meet Skerry Post

Skerry Post delivers small parcels between the islands of an archipelago, and it does it with drones. There are three kinds:

- the **Sparrow**, a light quadcopter for letters and small boxes,
- the **Heron**, a heavy lifter for crates,
- the **Glider**, a fixed-wing plane that covers long distances.

You are the person who writes the dispatch software, one Rust program that grows lesson by lesson. The *fleet board* beside the editor draws whatever your program sends it. This course follows Corvid Peak, so you already know structs, \`impl\` blocks, \`String\`, \`Vec\`, closures and iterators. Here the big new idea is the **trait**.

### Where to type, and what a red error is

You type in the editor and press **Run**. Run builds your program with a real Rust compiler on a server (2 to 6 seconds), then shows what it printed in the **Output** tab. Lines that start with \`@scene\` are not for reading: they are the values your code sent to the fleet board, and you can inspect them in the **Scene data** tab. A red box is the compiler stopping you before the program runs, and in Rust that is a *teacher*: it names the problem, points at the line and often suggests the fix.

Two helpers are provided for the board (they live out of sight, above your file):

~~~rust
scene("roster", vec![Json::new().with("kind", "Sparrow").with("battery", 82)]);
// prints   @scene {"roster": [{"kind": "Sparrow", "battery": 82}]}
~~~

\`Json::new().with("name", value)\` builds one record, \`.with\` can be chained, and \`scene("key", value)\` sends it. A number, a \`&str\`, a \`String\`, a \`bool\`, an \`Option\` or a \`Vec\` of those can go in as a value.

### The problem: three kinds of drone, one dispatcher

The dispatcher at the harbour does not care how a drone is built. For every drone it just wants to ask two questions: "what is your callsign?" and "how much battery is left?". But each kind of drone is a different type:

~~~rust
struct Sparrow { tag: u32, battery: u32 }
struct Heron   { tag: u32, battery: u32, lift_kg: u32 }
struct Glider  { tag: u32, battery: u32 }
~~~

Without anything new you would write \`sparrow_callsign\`, \`heron_callsign\` and \`glider_callsign\`, three functions that do the same job under three names, and a fourth kind of drone would need a fourth copy. Real life solved this long ago. A bicycle courier, a van driver and a boat captain are very different, yet a dispatcher can hire all of them with one job description: "must be able to give a name and report a charge level". The job description does not say *how*. It lists what the worker **can do**.

### A trait is that job description

A **trait** is a named list of abilities, written as method signatures (a *signature* is the first line of a function: its name, inputs and output, without the body). Any type that **implements** the trait promises to provide every method on the list.

~~~rust
trait Drone {
    fn callsign(&self) -> String;
    fn battery(&self) -> u32;
}
~~~

- \`trait Drone { ... }\` declares the job description. The name is yours.
- Each line ends with \`;\` instead of a body: the trait says *what*, not *how*.
- \`&self\` means "I only look at the drone I am called on" (a borrowed view, nothing is moved or changed).

Each type then signs the job description and fills in its own *how*:

~~~rust
impl Drone for Sparrow {
    fn callsign(&self) -> String {
        format!("Sparrow-{}", self.tag)
    }
    fn battery(&self) -> u32 {
        self.battery
    }
}
~~~

\`impl Drone for Sparrow\` reads "Sparrow can do everything Drone lists". Inside, the signatures must match the trait exactly. After that the ordinary method syntax works:

~~~rust
let sparrow = Sparrow { tag: 7, battery: 82 };
println!("{} battery {}", sparrow.callsign(), sparrow.battery());
~~~

~~~text
Sparrow-7 battery 82
~~~

\`Heron\` and \`Glider\` get their own \`impl Drone for ...\` blocks, with their own text ("Heron-2") and their own way to read the battery. The *trait* is shared, the *work* is not.

### What the compiler checks

The compiler is the strict inspector of that promise. Leave a method out and it tells you which one:

~~~text
error[E0046]: not all trait items implemented, missing: \`battery\`
  --> main.rs:6:1
   |
 4 |     fn battery(&self) -> u32;
   |     ------------------------- \`battery\` from trait
 5 | }
 6 | impl Drone for Sparrow {
   | ^^^^^^^^^^^^^^^^^^^^^^ missing \`battery\` in implementation
~~~

Read it from the bottom up: the caret line names the \`impl\`, and the line above it shows the method the trait wanted. Write the method with a different type and you get \`E0053\` ("method has an incompatible type for trait", with "expected \`u32\`, found \`u8\`"). And if you never wrote the \`impl\` for a type, calling the method fails with \`E0599\`:

~~~text
error[E0599]: no method named \`callsign\` found for struct \`Glider\` in the current scope
   |
   = help: items from traits can only be used if the trait is implemented and in scope
~~~

"Implemented and in scope" is the whole rule: the type must have its \`impl\`, and the trait must be visible where you call the method (everything is in one file here, so it always is).

### Going further (optional)

Rust's standard library is full of traits you already used: \`Display\` is "can be printed for people", \`Clone\` is "can make a copy". The \`scene\` helper itself is built on a small trait that says "can turn itself into JSON".`,
      mission: md`The harbour office has three drones on the pads right now. Your first job is the dispatcher's roll call: ask each drone for its callsign and its battery through **one shared trait**, print the roll call, and send it to the fleet board.

The three drone types are already written for you above \`main\`. You write the trait, sign it three times, and call it.`,
      tasks: [
        "Above the divider write trait Drone with two method signatures: fn callsign(&self) -> String; and fn battery(&self) -> u32;",
        "Write impl Drone for Sparrow, impl Drone for Heron and impl Drone for Glider. callsign returns format!(\"Sparrow-{}\", self.tag) (and \"Heron-{}\", \"Glider-{}\"); battery returns self.battery",
        "In main create let sparrow = Sparrow { tag: 7, battery: 82 }; let heron = Heron { tag: 2, battery: 64, lift_kg: 12 }; and let glider = Glider { tag: 4, battery: 91 };",
        "Print one line per drone, like Sparrow-7 battery 82, using the trait methods callsign() and battery()",
        "Send scene(\"roster\", ...): a vec of three Json records, each with kind (\"Sparrow\", \"Heron\" or \"Glider\"), callsign and battery taken from the trait methods",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: a trait is a list of abilities. The three drone types are given; the trait and the main code are yours.
// Above main:
//   trait Drone { fn callsign(&self) -> String; fn battery(&self) -> u32; }
//   impl Drone for Sparrow { ... }   impl Drone for Heron { ... }   impl Drone for Glider { ... }
//   callsign: format!("Sparrow-{}", self.tag)  (Heron-, Glider-)       battery: self.battery
// Inside main:
//   let sparrow = Sparrow { tag: 7, battery: 82 };  let heron = Heron { tag: 2, battery: 64, lift_kg: 12 };  let glider = Glider { tag: 4, battery: 91 };
//   print:  Sparrow-7 battery 82   Heron-2 battery 64   Glider-4 battery 91      (use sparrow.callsign() and sparrow.battery())
//   scene("roster", vec![ Json::new().with("kind", "Sparrow").with("callsign", sparrow.callsign()).with("battery", sparrow.battery()), ... ]);

struct Sparrow {
    tag: u32,
    battery: u32,
}

struct Heron {
    tag: u32,
    battery: u32,
    lift_kg: u32,
}

struct Glider {
    tag: u32,
    battery: u32,
}

fn main() {
    // This placeholder keeps the file building. Replace it with your own lines.
    println!("TODO: ask the drones what they can do");
}`,
      solutionAdd: rs`struct Sparrow {
    tag: u32,
    battery: u32,
}

struct Heron {
    tag: u32,
    battery: u32,
    lift_kg: u32,
}

struct Glider {
    tag: u32,
    battery: u32,
}

trait Drone {
    fn callsign(&self) -> String;
    fn battery(&self) -> u32;
}

impl Drone for Sparrow {
    fn callsign(&self) -> String {
        format!("Sparrow-{}", self.tag)
    }
    fn battery(&self) -> u32 {
        self.battery
    }
}

impl Drone for Heron {
    fn callsign(&self) -> String {
        format!("Heron-{}", self.tag)
    }
    fn battery(&self) -> u32 {
        self.battery
    }
}

impl Drone for Glider {
    fn callsign(&self) -> String {
        format!("Glider-{}", self.tag)
    }
    fn battery(&self) -> u32 {
        self.battery
    }
}

fn main() {
    // Lesson 1: ask each drone what it can do.
    let sparrow = Sparrow { tag: 7, battery: 82 };
    let heron = Heron { tag: 2, battery: 64, lift_kg: 12 };
    let glider = Glider { tag: 4, battery: 91 };

    println!("{} battery {}", sparrow.callsign(), sparrow.battery());
    println!("{} battery {}", heron.callsign(), heron.battery());
    println!("{} battery {}", glider.callsign(), glider.battery());

    scene(
        "roster",
        vec![
            Json::new().with("kind", "Sparrow").with("callsign", sparrow.callsign()).with("battery", sparrow.battery()),
            Json::new().with("kind", "Heron").with("callsign", heron.callsign()).with("battery", heron.battery()),
            Json::new().with("kind", "Glider").with("callsign", glider.callsign()).with("battery", glider.battery()),
        ],
    );
}`,
      explanation:
        "trait Drone lists two abilities as signatures. Each impl Drone for ... block supplies the body for one type, and the compiler checks that every method is present with exactly the trait's signature. After that sparrow.callsign() works like any method, and so do the same calls on a Heron and a Glider: one job description, three different ways to do the job.",
      hints: [
        { id: "h1", title: "The trait", content: "trait Drone { fn callsign(&self) -> String; fn battery(&self) -> u32; } The two lines end with a semicolon and have no body. Put it above fn main, next to the structs." },
        { id: "h2", title: "One impl per type", content: "impl Drone for Sparrow { fn callsign(&self) -> String { format!(\"Sparrow-{}\", self.tag) } fn battery(&self) -> u32 { self.battery } } and the same shape for Heron (\"Heron-{}\") and Glider (\"Glider-{}\")." },
        { id: "h3", title: "Printing and the scene", content: "println!(\"{} battery {}\", sparrow.callsign(), sparrow.battery()); For the scene, vec![Json::new().with(\"kind\", \"Sparrow\").with(\"callsign\", sparrow.callsign()).with(\"battery\", sparrow.battery()), ...] with one record per drone." },
      ],
      tests: [
        {
          id: "t1",
          description: "The roll call prints one line per drone",
          assertionCode: js`
assert(lines.includes("Sparrow-7 battery 82"), 'No line is exactly "Sparrow-7 battery 82". Print sparrow.callsign() and sparrow.battery() with println!("{} battery {}", ...).');
assert(lines.includes("Heron-2 battery 64"), 'No line is exactly "Heron-2 battery 64". The Heron needs its own impl Drone for Heron whose callsign is format!("Heron-{}", self.tag).');
assert(lines.includes("Glider-4 battery 91"), 'No line is exactly "Glider-4 battery 91". The Glider needs impl Drone for Glider too.');`,
        },
        {
          id: "t2",
          description: "The board receives a roster of three drones",
          assertionCode: js`
const r = scene.roster;
assert(Array.isArray(r) && r.length === 3, 'Send scene("roster", vec![...]) with three Json records, one per drone.');
assertEqual(r.map((d) => d.kind), ["Sparrow", "Heron", "Glider"], 'The kinds should be "Sparrow", "Heron", "Glider", in that order.');`,
        },
        {
          id: "t3",
          description: "Each roster record carries what the trait returned",
          assertionCode: js`
const r = scene.roster;
assert(Array.isArray(r) && r.length === 3, 'Send scene("roster", ...) first.');
assertEqual(r.map((d) => d.callsign), ["Sparrow-7", "Heron-2", "Glider-4"], 'Each record needs "callsign" from the trait method callsign().');
assertEqual(r.map((d) => d.battery), [82, 64, 91], 'Each record needs "battery" from the trait method battery() (a number).');`,
        },
      ],
      unlocks: ["df-roster"],
      checks: [
        {
          prompt: "What does `trait Drone { fn battery(&self) -> u32; }` do?",
          question: {
            type: "choice",
            options: ["It makes a new kind of drone", "It lists an ability that any type signing up must provide, without saying how", "It calculates the battery of every drone", "It copies the Sparrow struct"],
            answer: 1,
          },
          explanation: "A trait is a job description: it lists signatures only. Each type that writes `impl Drone for ...` supplies the real body.",
        },
        {
          prompt: "You wrote `impl Drone for Heron` but forgot the `battery` method. Which error code do you get?",
          question: { type: "text", answer: ["E0046", "e0046"] },
          explanation: "`E0046`: not all trait items implemented. The message names the missing method (`battery`) and shows it where the trait declares it.",
        },
      ],
    },
    // ───────────────────────── 2 ─────────────────────────
    {
      id: "rust-traits-2-defaults",
      title: "Default methods and supertraits",
      minutes: 35,
      xp: 130,
      concepts: ["default method", "override", "supertrait", "Self methods", "second trait on a type"],
      learn: md`### Most drones do it the same way

Skerry Post has a new rule: before a parcel is loaded, the dispatcher asks the drone "can you lift this many kilograms?". For almost every drone the answer is the same sum: *the parcel must weigh no more than what the drone can carry*. Writing that same sum into every \`impl\` block would be copying and pasting, and one forgotten copy means one drone that lies about its strength.

Think of the staff handbook of a company. It says "lunch break is 30 minutes" once. Everybody follows it, and only the night guard has a signed exception. A trait can do the same thing.

### A default method is a method with a body inside the trait

~~~rust
trait Carrier: Drone {
    fn capacity_kg(&self) -> u32;

    fn can_lift(&self, kg: u32) -> bool {
        kg <= self.capacity_kg()
    }

    fn rig_note(&self) -> String {
        String::from("standard rig")
    }
}
~~~

There are two kinds of method here:

- \`capacity_kg\` has no body: it is **required**. Every type must write it, because only the type knows its own strength.
- \`can_lift\` and \`rig_note\` have bodies: they are **default methods**. A type that says nothing about them *inherits* the default.

Look at how \`can_lift\` works: it calls \`self.capacity_kg()\`. A default method can use the trait's other methods, even though it does not know yet which type it will run for. That is the pay-off of the contract: whatever type arrives, \`capacity_kg\` exists.

### Using the defaults, and overriding one

~~~rust
impl Carrier for Sparrow {
    fn capacity_kg(&self) -> u32 { 2 }          // inherits can_lift and rig_note
}

impl Carrier for Glider {
    fn capacity_kg(&self) -> u32 { 6 }
    fn can_lift(&self, kg: u32) -> bool {       // overrides the default
        kg + 1 <= self.capacity_kg()            // the wing rack itself weighs 1 kg
    }
    fn rig_note(&self) -> String {
        String::from("wing rack, no hover")
    }
}
~~~

To **override** a default you simply write the method again in the \`impl\`. Every caller keeps writing \`glider.can_lift(6)\`; Rust picks the Glider's own version for a Glider and the shared one for everyone else. Asking a 6 kg question:

~~~text
Sparrow-7: can_lift(6) -> false   (6 <= 2 is false)
Heron-2:   can_lift(6) -> true    (6 <= 12 is true)
Glider-4:  can_lift(6) -> false   (6 + 1 <= 6 is false, though the default would say true)
~~~

### A trait can require another trait

Did you spot \`trait Carrier: Drone\`? The \`: Drone\` part is a **supertrait**: it means "to be a Carrier a type must already be a Drone". Think of a rule at the loading dock: you cannot be signed up as a carrier unless you already have a callsign and a battery gauge. Two things follow:

- Inside \`Carrier\`'s default methods you may call \`self.callsign()\` and \`self.battery()\`.
- \`impl Carrier for Sparrow\` is only accepted because \`impl Drone for Sparrow\` exists. If it did not, the compiler would report \`E0277\` ("the trait bound \`Sparrow: Drone\` is not satisfied").

A type can implement as many traits as it likes. \`Sparrow\` now has two lists of abilities, and a method call finds the right one by name.

### Common mistakes

- Giving the override a different signature than the trait's (\`E0053\`).
- Writing a body for a method and still expecting each type to provide it: if there is a body, it is optional.
- Forgetting that a required method (\`capacity_kg\`) has no default, so a missing one is \`E0046\` again.`,
      mission: md`Every parcel now has a weight, and the harbour office wants to ask any drone "can you lift this?" without repeating the sum in three places. You write one second trait, **Carrier**, with a shared rule, and let the Glider override it because its wing rack is heavy.

Ask all three drones about a 6 kg parcel, print what each answers together with its rig note, and send the result to the fleet board.`,
      tasks: [
        "Above the divider write trait Carrier: Drone with a required fn capacity_kg(&self) -> u32; and two default methods: can_lift(&self, kg: u32) -> bool (kg <= self.capacity_kg()) and rig_note(&self) -> String (\"standard rig\")",
        "impl Carrier for Sparrow (capacity 2) and for Heron (capacity self.lift_kg). Both keep the defaults",
        "impl Carrier for Glider (capacity 6) and override can_lift as kg + 1 <= self.capacity_kg() and rig_note as \"wing rack, no hover\"",
        "In main print one line per drone, like Sparrow-7 can lift 6 kg: false (standard rig), using callsign(), can_lift(6) and rig_note()",
        "Send scene(\"carriers\", ...): three Json records with callsign, capacityKg, canLift6 (bool), note and overridden (true only for the Glider)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: default methods and a supertrait. Above main:
//   trait Carrier: Drone { fn capacity_kg(&self) -> u32;
//                          fn can_lift(&self, kg: u32) -> bool { kg <= self.capacity_kg() }
//                          fn rig_note(&self) -> String { String::from("standard rig") } }
//   impl Carrier for Sparrow { capacity 2 }   impl Carrier for Heron { capacity self.lift_kg }
//   impl Carrier for Glider { capacity 6, override can_lift (kg + 1 <= capacity) and rig_note ("wing rack, no hover") }
${MAIN_DIVIDER}
// print, one line per drone:   Sparrow-7 can lift 6 kg: false (standard rig)
//                              Heron-2 can lift 6 kg: true (standard rig)
//                              Glider-4 can lift 6 kg: false (wing rack, no hover)
// scene("carriers", vec![ Json::new().with("callsign", ..).with("capacityKg", ..).with("canLift6", ..).with("note", ..).with("overridden", false), ... ]);
`,
      solutionAdd: rs`trait Carrier: Drone {
    fn capacity_kg(&self) -> u32;

    fn can_lift(&self, kg: u32) -> bool {
        kg <= self.capacity_kg()
    }

    fn rig_note(&self) -> String {
        String::from("standard rig")
    }
}

impl Carrier for Sparrow {
    fn capacity_kg(&self) -> u32 {
        2
    }
}

impl Carrier for Heron {
    fn capacity_kg(&self) -> u32 {
        self.lift_kg
    }
}

impl Carrier for Glider {
    fn capacity_kg(&self) -> u32 {
        6
    }
    fn can_lift(&self, kg: u32) -> bool {
        kg + 1 <= self.capacity_kg()
    }
    fn rig_note(&self) -> String {
        String::from("wing rack, no hover")
    }
}
${MAIN_DIVIDER}
// Lesson 2: ask every drone about a 6 kg parcel.
println!("{} can lift 6 kg: {} ({})", sparrow.callsign(), sparrow.can_lift(6), sparrow.rig_note());
println!("{} can lift 6 kg: {} ({})", heron.callsign(), heron.can_lift(6), heron.rig_note());
println!("{} can lift 6 kg: {} ({})", glider.callsign(), glider.can_lift(6), glider.rig_note());

scene(
    "carriers",
    vec![
        Json::new()
            .with("callsign", sparrow.callsign())
            .with("capacityKg", sparrow.capacity_kg())
            .with("canLift6", sparrow.can_lift(6))
            .with("note", sparrow.rig_note())
            .with("overridden", false),
        Json::new()
            .with("callsign", heron.callsign())
            .with("capacityKg", heron.capacity_kg())
            .with("canLift6", heron.can_lift(6))
            .with("note", heron.rig_note())
            .with("overridden", false),
        Json::new()
            .with("callsign", glider.callsign())
            .with("capacityKg", glider.capacity_kg())
            .with("canLift6", glider.can_lift(6))
            .with("note", glider.rig_note())
            .with("overridden", true),
    ],
);`,
      explanation:
        "capacity_kg is required, so every type writes it. can_lift and rig_note have bodies in the trait, so Sparrow and Heron inherit them for free, while Glider writes its own versions to override them. Because Carrier has Drone as a supertrait, callsign() is available on every Carrier too. The Glider's can_lift(6) is false (6 + 1 > 6) although the shared rule alone would have said true.",
      hints: [
        { id: "h1", title: "The trait with defaults", content: "trait Carrier: Drone { fn capacity_kg(&self) -> u32; fn can_lift(&self, kg: u32) -> bool { kg <= self.capacity_kg() } fn rig_note(&self) -> String { String::from(\"standard rig\") } }" },
        { id: "h2", title: "Which impls say what", content: "Sparrow: impl Carrier for Sparrow { fn capacity_kg(&self) -> u32 { 2 } } with nothing else. Heron returns self.lift_kg. Glider returns 6 AND writes can_lift (kg + 1 <= self.capacity_kg()) and rig_note again." },
        { id: "h3", title: "Printing", content: "println!(\"{} can lift 6 kg: {} ({})\", glider.callsign(), glider.can_lift(6), glider.rig_note()); bool values print as true or false. Only the Glider gets overridden: true in the scene." },
      ],
      tests: [
        {
          id: "t1",
          description: "Sparrow and Heron use the shared rule",
          assertionCode: js`
assert(lines.includes("Sparrow-7 can lift 6 kg: false (standard rig)"), 'No line is exactly "Sparrow-7 can lift 6 kg: false (standard rig)". The Sparrow only writes capacity_kg (2); can_lift and rig_note come from the trait.');
assert(lines.includes("Heron-2 can lift 6 kg: true (standard rig)"), 'No line is exactly "Heron-2 can lift 6 kg: true (standard rig)". The Heron\'s capacity_kg is self.lift_kg (12).');`,
        },
        {
          id: "t2",
          description: "The Glider overrides both defaults",
          assertionCode: js`assert(lines.includes("Glider-4 can lift 6 kg: false (wing rack, no hover)"), 'No line is exactly "Glider-4 can lift 6 kg: false (wing rack, no hover)". Override can_lift with kg + 1 <= self.capacity_kg() and rig_note with "wing rack, no hover" inside impl Carrier for Glider.');`,
        },
        {
          id: "t3",
          description: "The board receives the carrier cards",
          assertionCode: js`
const c = scene.carriers;
assert(Array.isArray(c) && c.length === 3, 'Send scene("carriers", vec![...]) with three records: Sparrow, Heron, Glider.');
assertEqual(c.map((x) => x.capacityKg), [2, 12, 6], "capacityKg should be 2, 12 and 6 (from capacity_kg()).");
assertEqual(c.map((x) => x.canLift6), [false, true, false], "canLift6 should be false, true, false (from can_lift(6)).");
assertEqual(c.map((x) => x.overridden), [false, false, true], "Only the Glider overrides the default: overridden is false, false, true.");
assertEqual(c[2].note, "wing rack, no hover", 'The Glider\'s note should be "wing rack, no hover".');`,
        },
      ],
      unlocks: ["df-abilities"],
      checks: [
        {
          prompt: "A trait method has a body inside the trait. What does a type that implements the trait have to do about it?",
          question: {
            type: "choice",
            options: ["It must write the method", "Nothing: it inherits the default, and may override it", "It can never change it", "It must copy the body into its struct"],
            answer: 1,
          },
          explanation: "A method with a body is a *default method*. Types inherit it for free; writing the method again in the `impl` overrides it for that type only.",
        },
        {
          prompt: "What does the `: Drone` in `trait Carrier: Drone` mean?",
          question: {
            type: "choice",
            options: ["Carrier is a type, Drone is its field", "Every Carrier must also be a Drone (Drone is a supertrait)", "Carrier replaces Drone", "Drone is the return type"],
            answer: 1,
          },
          explanation: "A supertrait is a prerequisite: a type can only implement Carrier if it already implements Drone, and Carrier's methods may call Drone's.",
        },
      ],
    },
    // ───────────────────────── 3 ─────────────────────────
    {
      id: "rust-traits-3-generics",
      title: "Generics: one function, any drone",
      minutes: 40,
      xp: 150,
      concepts: ["generic function", "type parameter T", "trait bound", "monomorphisation", "E0599", "E0277"],
      learn: md`### The copy-paste problem, again

So far the only way to *use* an ability is to call it on one named drone. Now the harbour office wants reports: "Sparrow-7 at 82%" for a Sparrow, the same for a Heron, the same for a Glider. Here is the concrete version, written the slow way:

~~~rust
fn sparrow_power_line(d: &Sparrow) -> String { format!("{} at {}%", d.callsign(), d.battery()) }
fn heron_power_line(d: &Heron) -> String     { format!("{} at {}%", d.callsign(), d.battery()) }
fn glider_power_line(d: &Glider) -> String   { format!("{} at {}%", d.callsign(), d.battery()) }
~~~

The three bodies are identical. Only the *type* in the signature changes. Compare it with a hospital: the receptionist's job is "greet whoever walks in", not "greet a child, then greet a grown-up, then greet a grandparent". She writes the job once.

### A generic function has a placeholder type

~~~rust
fn power_line<T: Drone>(d: &T) -> String {
    format!("{} at {}%", d.callsign(), d.battery())
}
~~~

Read the first line piece by piece:

- \`<T ...>\` introduces a **type parameter**: \`T\` is a stand-in for "some type, decided by whoever calls me". The letter is a habit (T for type); the name is yours.
- \`: Drone\` is a **trait bound**. It limits the stand-in: "T can be any type *as long as it implements Drone*". A bound is the entrance rule at the door.
- \`d: &T\` takes a borrowed T.

Why is the bound needed at all? Because inside the function the compiler only knows what the bound promises. Without it, \`T\` could be a number or a string, and \`d.callsign()\` would be a lie. Take the bound away and you get a message worth learning to read:

~~~text
error[E0599]: no method named \`callsign\` found for reference \`&T\` in the current scope
   |
   |     d.callsign()
   |       ^^^^^^^^ method not found in \`&T\`
   |
   = help: items from traits can only be used if the type parameter is bounded by the trait
help: ... perhaps you need to restrict type parameter \`T\` with it:
   | fn describe<T: Drone>(d: &T) -> String {
   |              +++++++
~~~

### Calling it, and what the compiler does with it

~~~rust
println!("{}", power_line(&sparrow));   // Sparrow-7 at 82%
println!("{}", power_line(&heron));     // Heron-2 at 64%
println!("{}", power_line(&glider));    // Glider-4 at 91%
~~~

You never write \`power_line::<Sparrow>\`; Rust works out T from the argument. Behind the curtain, though, the compiler does exactly what you did by hand: for every type the function is used with, it writes a **specialised copy** (\`power_line\` for Sparrow, one for Heron, one for Glider). This is called **monomorphisation** (Greek for "one shape each"). The consequence is the big selling point of generics in Rust: the finished program contains plain, direct calls, as fast as if you had written the three functions yourself. The price is a slightly bigger program.

Another example, where the same \`T\` appears twice, forcing both inputs to be the **same** type:

~~~rust
fn stronger<T: Carrier>(a: T, b: T) -> T {
    if b.capacity_kg() > a.capacity_kg() { b } else { a }
}
~~~

\`stronger(heron_one, heron_two)\` compiles. \`stronger(a_sparrow, a_heron)\` does not: T cannot be both. This function takes its arguments by value (it *moves* them in, and gives one back).

### The error you will meet most: E0277

Pass something that has no \`impl Drone\`:

~~~text
error[E0277]: the trait bound \`{integer}: Drone\` is not satisfied
   |
   |     let p = power_line(&5);
   |             ---------- ^^ the trait \`Drone\` is not implemented for \`{integer}\`
   |             |
   |             required by a bound introduced by this call
help: the following other types implement trait \`Drone\`
   | impl Drone for Sparrow { ... }   | impl Drone for Heron { ... }   | impl Drone for Glider { ... }
note: required by a bound in \`power_line\`
~~~

Read it as: *"you called power_line; it demands Drone; the argument is not a Drone."* The compiler even lists the types that would have been accepted. \`E0277\` in general means "a trait that something needs is missing here".

### Common mistakes

- Writing \`fn power_line<T>(d: &T)\` and forgetting the bound (\`E0599\` inside the function).
- Expecting two different types to share one \`T\` (the compiler says "expected Heron, found Sparrow").
- Believing generics are slow or "dynamic". They are resolved at compile time, which is why they are fast.`,
      mission: md`The harbour office prints a power report every hour, and two jobs came in. First, a **power line** for any drone: "Sparrow-7 at 82%". Second, a **pick the stronger** helper for two drones of the same kind, to decide which Heron takes the big crate.

Write both as generic functions, run them on your drones, and tell the board which concrete copies the compiler had to make.`,
      tasks: [
        "Above the divider write fn power_line<T: Drone>(d: &T) -> String returning format!(\"{} at {}%\", d.callsign(), d.battery())",
        "Write fn stronger<T: Carrier>(a: T, b: T) -> T that returns b when b.capacity_kg() > a.capacity_kg(), otherwise a",
        "In main print power_line(&sparrow), power_line(&heron) and power_line(&glider), one line each (Sparrow-7 at 82% ...)",
        "Make let big = stronger(Heron { tag: 5, battery: 70, lift_kg: 9 }, Heron { tag: 6, battery: 40, lift_kg: 15 }); and print Stronger heron: Heron-6 (15 kg) using big.callsign() and big.capacity_kg()",
        "Send scene(\"monomorphs\", ...): four Json records with copy (\"power_line::<Sparrow>\", \"power_line::<Heron>\", \"power_line::<Glider>\", \"stronger::<Heron>\") and result (the text each call returned)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: generics with trait bounds. Above main:
//   fn power_line<T: Drone>(d: &T) -> String                 "Sparrow-7 at 82%"
//   fn stronger<T: Carrier>(a: T, b: T) -> T                 the one with the bigger capacity_kg(); on a tie keep a
${MAIN_DIVIDER}
// print  Sparrow-7 at 82% / Heron-2 at 64% / Glider-4 at 91%   (power_line(&sparrow) ...)
// let big = stronger(Heron { tag: 5, battery: 70, lift_kg: 9 }, Heron { tag: 6, battery: 40, lift_kg: 15 });
// print  Stronger heron: Heron-6 (15 kg)
// scene("monomorphs", vec![ Json::new().with("copy", "power_line::<Sparrow>").with("result", power_line(&sparrow)), ... four records ... ]);
`,
      solutionAdd: rs`fn power_line<T: Drone>(d: &T) -> String {
    format!("{} at {}%", d.callsign(), d.battery())
}

fn stronger<T: Carrier>(a: T, b: T) -> T {
    if b.capacity_kg() > a.capacity_kg() {
        b
    } else {
        a
    }
}
${MAIN_DIVIDER}
// Lesson 3: one generic function, any drone.
println!("{}", power_line(&sparrow));
println!("{}", power_line(&heron));
println!("{}", power_line(&glider));

let big = stronger(Heron { tag: 5, battery: 70, lift_kg: 9 }, Heron { tag: 6, battery: 40, lift_kg: 15 });
println!("Stronger heron: {} ({} kg)", big.callsign(), big.capacity_kg());

scene(
    "monomorphs",
    vec![
        Json::new().with("copy", "power_line::<Sparrow>").with("result", power_line(&sparrow)),
        Json::new().with("copy", "power_line::<Heron>").with("result", power_line(&heron)),
        Json::new().with("copy", "power_line::<Glider>").with("result", power_line(&glider)),
        Json::new().with("copy", "stronger::<Heron>").with("result", big.callsign()),
    ],
);`,
      explanation:
        "power_line<T: Drone> is written once, and the compiler stamps out a copy for Sparrow, Heron and Glider (monomorphisation). The bound T: Drone is what allows d.callsign() and d.battery() inside. stronger<T: Carrier> uses one T for both inputs and the output, so the two arguments must be the same type; the Heron with the bigger lift_kg (15) wins.",
      hints: [
        { id: "h1", title: "The first generic function", content: "fn power_line<T: Drone>(d: &T) -> String { format!(\"{} at {}%\", d.callsign(), d.battery()) } Without the : Drone bound, d.callsign() gives E0599." },
        { id: "h2", title: "stronger", content: "fn stronger<T: Carrier>(a: T, b: T) -> T { if b.capacity_kg() > a.capacity_kg() { b } else { a } } Both inputs and the result are the same T." },
        { id: "h3", title: "The scene", content: "scene(\"monomorphs\", vec![Json::new().with(\"copy\", \"power_line::<Sparrow>\").with(\"result\", power_line(&sparrow)), ... ]); the fourth record is \"stronger::<Heron>\" with result big.callsign()." },
      ],
      tests: [
        {
          id: "t1",
          description: "power_line reports every kind of drone",
          assertionCode: js`
assert(lines.includes("Sparrow-7 at 82%"), 'No line is exactly "Sparrow-7 at 82%". Print power_line(&sparrow) on its own line.');
assert(lines.includes("Heron-2 at 64%"), 'No line is exactly "Heron-2 at 64%". The same generic function should accept the Heron: power_line(&heron).');
assert(lines.includes("Glider-4 at 91%"), 'No line is exactly "Glider-4 at 91%". The same generic function should accept the Glider: power_line(&glider).');`,
        },
        {
          id: "t2",
          description: "stronger picks the Heron with the bigger lift",
          assertionCode: js`assert(lines.includes("Stronger heron: Heron-6 (15 kg)"), 'No line is exactly "Stronger heron: Heron-6 (15 kg)". stronger(a, b) returns b when b.capacity_kg() > a.capacity_kg(); print big.callsign() and big.capacity_kg().');`,
        },
        {
          id: "t3",
          description: "The board learns which copies the compiler made",
          assertionCode: js`
const m = scene.monomorphs;
assert(Array.isArray(m) && m.length === 4, 'Send scene("monomorphs", vec![...]) with four records.');
assertEqual(m.map((x) => x.copy), ["power_line::<Sparrow>", "power_line::<Heron>", "power_line::<Glider>", "stronger::<Heron>"], "The copy names should be power_line::<Sparrow>, power_line::<Heron>, power_line::<Glider>, stronger::<Heron>.");
assertEqual(m.map((x) => x.result), ["Sparrow-7 at 82%", "Heron-2 at 64%", "Glider-4 at 91%", "Heron-6"], "Each result is what that call returned (the last one is big.callsign()).");`,
        },
      ],
      unlocks: ["df-generics"],
      checks: [
        {
          prompt: "In `fn power_line<T: Drone>(d: &T)`, what does `: Drone` do?",
          question: {
            type: "choice",
            options: ["It names the return type", "It restricts T to types that implement Drone, which lets the body call Drone's methods", "It converts T into a Drone", "It makes the function slower"],
            answer: 1,
          },
          explanation: "`T: Drone` is a trait bound. It is both a filter for callers (E0277 if the type does not qualify) and a permission for the body (the compiler only allows what the bound promises).",
        },
        {
          prompt: "What is monomorphisation, in one sentence?",
          question: {
            type: "choice",
            options: ["The compiler writes one specialised copy of a generic function for each type it is used with", "The function picks its type while the program runs", "Rust converts every type into the same type", "Generic functions are skipped by the compiler"],
            answer: 0,
          },
          explanation: "Generics are resolved at compile time: each concrete type gets its own copy, so calls are direct and fast.",
        },
      ],
    },
    // ───────────────────────── 4 ─────────────────────────
    {
      id: "rust-traits-4-bounds",
      title: "Several bounds, where clauses and impl Trait",
      minutes: 40,
      xp: 150,
      concepts: ["multiple bounds +", "where clause", "impl Trait argument", "impl Trait return", "E0277", "E0308"],
      learn: md`### Drones that can do two different things

The harbour has fitted radio beacons to some drones so the office can find them over the sea. The beacon is a completely separate ability from lifting: a drone can have either, both or neither. Here is the new trait, written the way you have now seen several times:

~~~rust
trait Beacon {
    fn ping(&self) -> String;
}
~~~

Only the Sparrow and the Heron carry a beacon (the Glider's radio was removed to save weight), so there are \`impl Beacon for Sparrow\` and \`impl Beacon for Heron\`, and none for Glider.

A **drop plan** needs both abilities at once: the drone must be able to lift the parcel *and* be trackable. You list several bounds with \`+\`:

~~~rust
fn plan_drop<T: Carrier + Beacon>(d: &T, kg: u32) -> String { ... }
~~~

Read the \`+\` as "and": T must implement \`Carrier\` **and** \`Beacon\`. It is a job advert that says "must hold a driving licence and a first-aid certificate".

### A where clause is the same thing, written tidier

When the bounds get long, the signature becomes hard to read. A **where clause** moves them to their own lines:

~~~rust
fn plan_drop<T>(d: &T, kg: u32) -> String
where
    T: Carrier + Beacon,
{
    if d.can_lift(kg) {
        format!("{} takes {} kg ({})", d.callsign(), kg, d.ping())
    } else {
        format!("{} cannot lift {} kg", d.callsign(), kg)
    }
}
~~~

\`fn f<T: A + B>(...)\` and \`fn f<T>(...) where T: A + B\` mean exactly the same. Use \`where\` when the line gets long or when you have more than one type parameter. Notice that the body uses \`callsign()\` from \`Drone\` as well: it is allowed, because \`Carrier: Drone\` makes every Carrier a Drone.

Try the plan on a Glider and the compiler refuses before the program even starts:

~~~text
error[E0277]: the trait bound \`Glider: Beacon\` is not satisfied
   |
   |     println!("{}", plan_drop(&g, 2));
   |                    --------- ^^ unsatisfied trait bound
   |                    |
   |                    required by a bound introduced by this call
   |
note: required by a bound in \`plan_drop\`
   |     T: Carrier + Beacon,
   |                  ^^^^^^ required by this bound in \`plan_drop\`
~~~

It points at the exact bound that failed (\`Beacon\`), not at the one that passed. The fix is on the Glider's side (write \`impl Beacon for Glider\`) or on the caller's side (do not ask a Glider).

### impl Trait: when you do not want to name T

For a simple function a type parameter is more ceremony than you need. \`impl Trait\` in the **argument** position is a short way to say "some type that implements this trait":

~~~rust
fn badge(d: &impl Drone) -> String {
    format!("[{}|{}%]", d.callsign(), d.battery())
}
~~~

That is the same as \`fn badge<T: Drone>(d: &T)\`, just shorter. The only thing you lose is the ability to say "these two arguments are the *same* type".

\`impl Trait\` also works in the **return** position, and there it does something generics cannot: it hides which type you return.

~~~rust
fn standby() -> impl Drone {
    Sparrow { tag: 99, battery: 100 }
}
~~~

The caller receives "some Drone" and may call \`callsign()\` and \`battery()\` on it, nothing else. Try \`standby().can_lift(2)\` and the compiler says the opaque type \`impl Drone\` has no method \`can_lift\`: the function only promised Drone.

There is one strict rule: the function must return **one single concrete type**. This is rejected, even though both branches are drones:

~~~text
error[E0308]: \`if\` and \`else\` have incompatible types
   |
   |         Heron { tag: 1, battery: 2, lift_kg: 3 }
   |         ---------------------------------------- expected because of this
   |     } else {
   |         Sparrow { tag: 1, battery: 2 }
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected \`Heron\`, found \`Sparrow\`
   |
help: you could change the return type to be a boxed trait object
   |  fn pick(big: bool) -> Box<dyn Drone> {
~~~

\`impl Drone\` means "one particular type that I am not naming", not "any of them, whichever I like". The compiler's own suggestion, a boxed trait object, is the next chapter's subject.

### Common mistakes

- Using \`,\` instead of \`+\` between bounds.
- Returning different drone types from the branches of an \`if\` with \`-> impl Trait\`.
- Expecting the caller of \`-> impl Drone\` to use methods the function never promised.`,
      mission: md`Two orders arrived. Parcel orders need a **drop plan**: only a drone that can lift the parcel *and* has a beacon may take it. And the harbour wants a **badge** for any drone's front-gate tag, plus a **standby unit** whose exact model the dispatcher should not need to know.

Add the Beacon trait, write the three helpers with a where clause and impl Trait, and send the plans to the board.`,
      tasks: [
        "Above the divider write trait Beacon { fn ping(&self) -> String; } and implement it for Sparrow (format!(\"beep from {}\", self.callsign())) and for Heron (format!(\"hoot from {}\", self.callsign()))",
        "Write fn plan_drop<T>(d: &T, kg: u32) -> String with a where clause T: Carrier + Beacon: when d.can_lift(kg) return format!(\"{} takes {} kg ({})\", d.callsign(), kg, d.ping()), otherwise format!(\"{} cannot lift {} kg\", d.callsign(), kg)",
        "Write fn badge(d: &impl Drone) -> String returning format!(\"[{}|{}%]\", d.callsign(), d.battery()), and fn standby() -> impl Drone returning Sparrow { tag: 99, battery: 100 }",
        "In main print plan_drop(&sparrow, 2), plan_drop(&heron, 10) and plan_drop(&heron, 20), then Standby unit: followed by power_line(&standby()) and Badge: followed by badge(&heron)",
        "Send scene(\"plans\", ...): three records (callsign, kg, ok, text) for the three plan_drop calls, and scene(\"standby\", ...) holding the standby unit's callsign",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: several bounds, where, impl Trait. Above main:
//   trait Beacon { fn ping(&self) -> String; }     impl Beacon for Sparrow ("beep from Sparrow-7")   impl Beacon for Heron ("hoot from Heron-2")
//   fn plan_drop<T>(d: &T, kg: u32) -> String where T: Carrier + Beacon      "Sparrow-7 takes 2 kg (beep from Sparrow-7)"  or  "Heron-2 cannot lift 20 kg"
//   fn badge(d: &impl Drone) -> String      "[Heron-2|64%]"
//   fn standby() -> impl Drone              Sparrow { tag: 99, battery: 100 }
${MAIN_DIVIDER}
// print  plan_drop(&sparrow, 2)   plan_drop(&heron, 10)   plan_drop(&heron, 20)
// print  Standby unit: Sparrow-99 at 100%       (let spare = standby(); power_line(&spare))
// print  Badge: [Heron-2|64%]
// scene("plans", vec![ Json::new().with("callsign", ..).with("kg", ..).with("ok", ..).with("text", ..), ... ]);   scene("standby", spare.callsign());
`,
      solutionAdd: rs`trait Beacon {
    fn ping(&self) -> String;
}

impl Beacon for Sparrow {
    fn ping(&self) -> String {
        format!("beep from {}", self.callsign())
    }
}

impl Beacon for Heron {
    fn ping(&self) -> String {
        format!("hoot from {}", self.callsign())
    }
}

fn plan_drop<T>(d: &T, kg: u32) -> String
where
    T: Carrier + Beacon,
{
    if d.can_lift(kg) {
        format!("{} takes {} kg ({})", d.callsign(), kg, d.ping())
    } else {
        format!("{} cannot lift {} kg", d.callsign(), kg)
    }
}

fn badge(d: &impl Drone) -> String {
    format!("[{}|{}%]", d.callsign(), d.battery())
}

fn standby() -> impl Drone {
    Sparrow { tag: 99, battery: 100 }
}
${MAIN_DIVIDER}
// Lesson 4: several bounds, where, impl Trait.
let plan_a = plan_drop(&sparrow, 2);
let plan_b = plan_drop(&heron, 10);
let plan_c = plan_drop(&heron, 20);
println!("{}", plan_a);
println!("{}", plan_b);
println!("{}", plan_c);

let spare = standby();
println!("Standby unit: {}", power_line(&spare));
println!("Badge: {}", badge(&heron));

scene(
    "plans",
    vec![
        Json::new().with("callsign", sparrow.callsign()).with("kg", 2u32).with("ok", true).with("text", plan_a),
        Json::new().with("callsign", heron.callsign()).with("kg", 10u32).with("ok", true).with("text", plan_b),
        Json::new().with("callsign", heron.callsign()).with("kg", 20u32).with("ok", false).with("text", plan_c),
    ],
);
scene("standby", spare.callsign());`,
      explanation:
        "T: Carrier + Beacon asks for both abilities, and the where clause is just the tidy spelling of the same bounds. impl Drone in an argument is shorthand for an anonymous type parameter; impl Drone as a return type hides which concrete drone comes back, so the caller can only use Drone's methods on it (power_line and callsign work, can_lift would not). Passing a Glider to plan_drop is rejected at compile time with E0277 because it has no Beacon.",
      hints: [
        { id: "h1", title: "Beacon first", content: "trait Beacon { fn ping(&self) -> String; } impl Beacon for Sparrow { fn ping(&self) -> String { format!(\"beep from {}\", self.callsign()) } } and the Heron says \"hoot from {}\"." },
        { id: "h2", title: "The where clause", content: "fn plan_drop<T>(d: &T, kg: u32) -> String\nwhere\n    T: Carrier + Beacon,\n{ if d.can_lift(kg) { format!(\"{} takes {} kg ({})\", d.callsign(), kg, d.ping()) } else { format!(\"{} cannot lift {} kg\", d.callsign(), kg) } }" },
        { id: "h3", title: "impl Trait and the prints", content: "fn badge(d: &impl Drone) -> String { ... } and fn standby() -> impl Drone { Sparrow { tag: 99, battery: 100 } }. Keep the result: let spare = standby(); then println!(\"Standby unit: {}\", power_line(&spare));" },
      ],
      tests: [
        {
          id: "t1",
          description: "plan_drop needs a drone that can lift and has a beacon",
          assertionCode: js`
assert(lines.includes("Sparrow-7 takes 2 kg (beep from Sparrow-7)"), 'No line is exactly "Sparrow-7 takes 2 kg (beep from Sparrow-7)". plan_drop(&sparrow, 2) should use can_lift and ping.');
assert(lines.includes("Heron-2 takes 10 kg (hoot from Heron-2)"), 'No line is exactly "Heron-2 takes 10 kg (hoot from Heron-2)". The Heron\'s ping is format!("hoot from {}", self.callsign()).');
assert(lines.includes("Heron-2 cannot lift 20 kg"), 'No line is exactly "Heron-2 cannot lift 20 kg". When can_lift(kg) is false, plan_drop returns format!("{} cannot lift {} kg", ...).');`,
        },
        {
          id: "t2",
          description: "impl Trait gives a badge and a standby unit",
          assertionCode: js`
assert(lines.includes("Standby unit: Sparrow-99 at 100%"), 'No line is exactly "Standby unit: Sparrow-99 at 100%". Keep let spare = standby(); and print power_line(&spare).');
assert(lines.includes("Badge: [Heron-2|64%]"), 'No line is exactly "Badge: [Heron-2|64%]". badge(d: &impl Drone) returns format!("[{}|{}%]", d.callsign(), d.battery()).');`,
        },
        {
          id: "t3",
          description: "The board receives the drop plans and the standby callsign",
          assertionCode: js`
const p = scene.plans;
assert(Array.isArray(p) && p.length === 3, 'Send scene("plans", vec![...]) with three records.');
assertEqual(p.map((x) => x.ok), [true, true, false], "ok should be true, true, false.");
assertEqual(p.map((x) => x.kg), [2, 10, 20], "kg should be 2, 10, 20.");
assertEqual(p[2].text, "Heron-2 cannot lift 20 kg", "Each record's text is what plan_drop returned.");
assertEqual(scene.standby, "Sparrow-99", 'Send scene("standby", spare.callsign()); the standby unit is Sparrow-99.');`,
        },
      ],
      unlocks: ["df-bounds"],
      checks: [
        {
          prompt: "You call `plan_drop(&glider, 2)` but `Glider` has no `Beacon`. What does the compiler do?",
          question: {
            type: "choice",
            options: ["Runs it and prints nothing", "Refuses to build: E0277, the trait bound `Glider: Beacon` is not satisfied", "Panics while running", "Quietly calls ping anyway"],
            answer: 1,
          },
          explanation: "Bounds are checked at compile time. The error points at the bound that failed, which is exactly `Beacon`.",
        },
        {
          prompt: "A function is declared `-> impl Drone`. Which statement is true?",
          question: {
            type: "choice",
            options: ["It may return a Sparrow on one path and a Heron on another", "It returns one concrete type that the caller cannot see, only use through Drone", "The caller can use every method of the concrete type", "It only works on Sparrow"],
            answer: 1,
          },
          explanation: "`impl Trait` in return position hides one fixed type. Different types on different paths need a trait object (next chapter).",
        },
      ],
    },
  ],
};
