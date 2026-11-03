import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 2: Mixed fleets. Trait objects (Box<dyn Trait>, &dyn Trait), dyn versus generics and
 * dyn compatibility, derive and Display, Default and From.
 */

export const chapter2: Chapter = {
  id: "mixed-fleets",
  title: "Mixed fleets",
  blurb: "Put different drones in one list with trait objects, decide between dyn and generics, and meet the everyday traits Debug, Clone, PartialEq, Display, Default and From.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "rust-traits-5-dyn",
      title: "Box<dyn Drone>: one list, many kinds",
      minutes: 40,
      xp: 160,
      concepts: ["trait object", "Box<dyn Trait>", "&dyn Trait", "vtable", "dynamic dispatch", "E0308", "E0277 Sized"],
      learn: md`### The roll call problem

Every morning the harbour office wants one list of every drone that flew yesterday, Sparrows, Herons and Gliders together, so a clerk can read down it. With generics from chapter 1 that does not work, and the compiler tells you why. A \`Vec\` holds values of **one** type:

~~~rust
let line_up = vec![sparrow, heron];
~~~

~~~text
error[E0308]: mismatched types
   |
   |     let line_up = vec![sparrow, heron];
   |                                 ^^^^^ expected \`Sparrow\`, found \`Heron\`
~~~

The list was started with a Sparrow, so it became "a list of Sparrows". Think of a row of egg-box holes: each hole has the same size, because Rust has to know exactly how much room each item needs. A Sparrow, a Heron and a Glider have different sizes.

Writing \`Vec<dyn Drone>\` ("a list of anything that is a Drone") is rejected for the same reason:

~~~text
error[E0277]: the size for values of type \`dyn Drone\` cannot be known at compilation time
   = help: the trait \`Sized\` is not implemented for \`dyn Drone\`
~~~

### The trick: a pointer is always the same size

If you can't store the drones themselves in equal holes, store something **equal-sized that leads to each drone**: a pointer. A **\`Box<T>\`** is exactly that: a small value that owns a \`T\` stored elsewhere (on the *heap*, the big pool of memory for values whose size is decided at run time). Think of a luggage locker ticket. The tickets are all the same size, whatever is in the lockers, and when the ticket is thrown away the locker is emptied.

~~~rust
let fleet: Vec<Box<dyn Drone>> = vec![
    Box::new(Sparrow { tag: 11, battery: 90 }),
    Box::new(Heron { tag: 12, battery: 55, lift_kg: 10 }),
    Box::new(Glider { tag: 13, battery: 30 }),
];
~~~

\`dyn Drone\` means "some value whose type I have forgotten, except that it implements Drone". A value like that, reached through a pointer, is called a **trait object**. The word \`dyn\` is short for *dynamic*, the reason is coming up. \`Box::new(...)\` puts a value in the locker, and the compiler quietly converts \`Box<Sparrow>\` into \`Box<dyn Drone>\` where the type says so.

### How does it know which callsign() to run?

~~~rust
for d in fleet.iter() {
    println!("{} at {}%", d.callsign(), d.battery());
}
~~~

\`d\` is only "a Drone", but the three \`callsign\` methods are three different pieces of code. A trait object is therefore not one pointer but **two**: one to the drone's data, and one to a small table, the **vtable**, that lists where each Drone method of *this* type lives. A restaurant works the same way: every table has a menu card, and the waiter reads the right card to know what that table may order. Calling \`d.callsign()\` means "look up callsign in the vtable, then jump there". This look-up happens while the program runs, which is why the technique is called **dynamic dispatch**. (Generics from lesson 3 are *static* dispatch: the compiler already chose the copy before the program started.)

~~~text
Box<dyn Drone>  =  [ pointer to data ] + [ pointer to the vtable of Sparrow's Drone methods ]
~~~

What can a trait object do? **Only what the trait lists.** The \`Vec<Box<dyn Drone>>\` knows callsigns and batteries, not that one entry has a \`lift_kg\` field.

### Borrowing a trait object: &dyn

You do not always need a box. When a function only looks, it can accept a borrowed trait object, and any ordinary reference to a drone coerces into it:

~~~rust
fn low_battery(d: &dyn Drone) -> bool {
    d.battery() < 40
}

low_battery(&glider);                  // &Glider becomes &dyn Drone
low_battery(fleet[0].as_ref());        // a Box<dyn Drone> lends itself with as_ref()
~~~

Functions over a whole fleet can take a slice, \`&[Box<dyn Drone>]\`, and the closure in \`filter\` just calls \`.callsign()\` as before.

### Common mistakes

- Forgetting the \`Box\` (\`Vec<dyn Drone>\`, E0277 about sizes).
- Trying to call a Heron-only field or method on a trait object: it is not on the list.
- Calling it "slow". The cost is one pointer lookup per call, tiny, and often exactly right. Lesson 6 compares the two options.`,
      mission: md`The morning list is due. Build a fleet of three drones of **different** kinds in one \`Vec\`, read it out with a clerk's function, and flag the ones whose battery is below 40 percent so the ground crew can recharge them.

The board will draw each box with its two pointers.`,
      tasks: [
        "Above the divider write fn roll_call(fleet: &[Box<dyn Drone>]) -> Vec<String> returning one format!(\"{} at {}%\", d.callsign(), d.battery()) per drone (iter + map + collect), and fn low_battery(d: &dyn Drone) -> bool (battery below 40)",
        "In main build let fleet: Vec<Box<dyn Drone>> = vec![ Box::new(Sparrow { tag: 11, battery: 90 }), Box::new(Heron { tag: 12, battery: 55, lift_kg: 10 }), Box::new(Glider { tag: 13, battery: 30 }) ];",
        "Print Fleet of 3: (use fleet.len()), then one line for each entry of roll_call(&fleet)",
        "Collect the callsigns of drones with a low battery (low_battery(d.as_ref())) and print Low battery: Glider-13; also print Glider-4 low: false using low_battery(&glider)",
        "Send scene(\"hangar\", ...) with three records (callsign, battery) and scene(\"lowBattery\", ...) with the vec of low callsigns",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: trait objects. Above main:
//   fn roll_call(fleet: &[Box<dyn Drone>]) -> Vec<String>     "Sparrow-11 at 90%" per drone
//   fn low_battery(d: &dyn Drone) -> bool                      battery below 40
${MAIN_DIVIDER}
// let fleet: Vec<Box<dyn Drone>> = vec![ Box::new(Sparrow { tag: 11, battery: 90 }), Box::new(Heron { tag: 12, battery: 55, lift_kg: 10 }), Box::new(Glider { tag: 13, battery: 30 }) ];
// print  Fleet of 3:   then the three roll_call lines
// let low: Vec<String> = fleet.iter().filter(|d| low_battery(d.as_ref())).map(|d| d.callsign()).collect();
// print  Low battery: Glider-13        (low.join(", "))        and        Glider-4 low: false      (low_battery(&glider))
// scene("hangar", vec![ Json::new().with("callsign", d.callsign()).with("battery", d.battery()) ... ]);   scene("lowBattery", &low);
`,
      solutionAdd: rs`fn roll_call(fleet: &[Box<dyn Drone>]) -> Vec<String> {
    fleet.iter().map(|d| format!("{} at {}%", d.callsign(), d.battery())).collect()
}

fn low_battery(d: &dyn Drone) -> bool {
    d.battery() < 40
}
${MAIN_DIVIDER}
// Lesson 5: one list, many kinds.
let fleet: Vec<Box<dyn Drone>> = vec![
    Box::new(Sparrow { tag: 11, battery: 90 }),
    Box::new(Heron { tag: 12, battery: 55, lift_kg: 10 }),
    Box::new(Glider { tag: 13, battery: 30 }),
];
println!("Fleet of {}:", fleet.len());
for line in roll_call(&fleet) {
    println!("{}", line);
}

let low: Vec<String> = fleet.iter().filter(|d| low_battery(d.as_ref())).map(|d| d.callsign()).collect();
println!("Low battery: {}", low.join(", "));
println!("Glider-4 low: {}", low_battery(&glider));

let hangar_cards: Vec<Json> = fleet
    .iter()
    .map(|d| Json::new().with("callsign", d.callsign()).with("battery", d.battery()))
    .collect();
scene("hangar", hangar_cards);
scene("lowBattery", &low);`,
      explanation:
        "A Vec needs equal-sized slots, so the drones go behind Box pointers and the element type becomes Box<dyn Drone>, a trait object: a data pointer plus a vtable pointer. Calling d.callsign() looks the right method up in the vtable at run time (dynamic dispatch), and the list can only use what the Drone trait lists. low_battery takes &dyn Drone so it accepts a plain &glider as well as a boxed drone's as_ref().",
      hints: [
        { id: "h1", title: "The two functions", content: "fn roll_call(fleet: &[Box<dyn Drone>]) -> Vec<String> { fleet.iter().map(|d| format!(\"{} at {}%\", d.callsign(), d.battery())).collect() } and fn low_battery(d: &dyn Drone) -> bool { d.battery() < 40 }" },
        { id: "h2", title: "The mixed Vec", content: "let fleet: Vec<Box<dyn Drone>> = vec![Box::new(Sparrow { tag: 11, battery: 90 }), Box::new(Heron { tag: 12, battery: 55, lift_kg: 10 }), Box::new(Glider { tag: 13, battery: 30 })]; The type annotation is what turns each Box<Sparrow> into a Box<dyn Drone>." },
        { id: "h3", title: "Low batteries and the scene", content: "let low: Vec<String> = fleet.iter().filter(|d| low_battery(d.as_ref())).map(|d| d.callsign()).collect(); For the scene build a Vec<Json> with fleet.iter().map(|d| Json::new().with(\"callsign\", d.callsign()).with(\"battery\", d.battery())).collect() and pass it to scene(\"hangar\", ...)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Three different kinds sit in one list and are read out",
          assertionCode: js`
assert(lines.includes("Fleet of 3:"), 'No line is exactly "Fleet of 3:". Print format!("Fleet of {}:", fleet.len()) before the roll call.');
assert(lines.includes("Sparrow-11 at 90%") && lines.includes("Heron-12 at 55%") && lines.includes("Glider-13 at 30%"), 'The roll call should print "Sparrow-11 at 90%", "Heron-12 at 55%" and "Glider-13 at 30%", one per line. Put three Box::new(...) drones in a Vec<Box<dyn Drone>> and loop over roll_call(&fleet).');`,
        },
        {
          id: "t2",
          description: "low_battery flags the drones below 40 percent, through &dyn Drone",
          assertionCode: js`
assert(lines.includes("Low battery: Glider-13"), 'No line is exactly "Low battery: Glider-13". Filter the fleet with low_battery(d.as_ref()) and join the callsigns with ", ".');
assert(lines.includes("Glider-4 low: false"), 'No line is exactly "Glider-4 low: false". low_battery(&glider) should compile too: a plain &Glider coerces into &dyn Drone.');`,
        },
        {
          id: "t3",
          description: "The board receives the boxed fleet",
          assertionCode: js`
const h = scene.hangar;
assert(Array.isArray(h) && h.length === 3, 'Send scene("hangar", ...) with three records, one per boxed drone.');
assertEqual(h.map((x) => x.callsign), ["Sparrow-11", "Heron-12", "Glider-13"], "The callsigns should be Sparrow-11, Heron-12, Glider-13 (from the trait objects).");
assertEqual(h.map((x) => x.battery), [90, 55, 30], "The batteries should be 90, 55, 30.");
assertEqual(scene.lowBattery, ["Glider-13"], 'Send scene("lowBattery", &low) with the low-battery callsigns.');`,
        },
      ],
      unlocks: ["df-hangar"],
      checks: [
        {
          prompt: "Why can't you write `Vec<dyn Drone>`?",
          question: {
            type: "choice",
            options: ["dyn is not allowed with Vec", "The compiler must know each item's size, and a bare dyn Drone has no fixed size; a Box<dyn Drone> is always one pointer pair", "Drone has too many methods", "Vec can only hold numbers"],
            answer: 1,
          },
          explanation: "A `Vec` stores equal-sized slots. A `Box<dyn Drone>` is a fixed-size pointer pair, whatever drone it leads to.",
        },
        {
          prompt: "What are the two pointers inside a `Box<dyn Drone>`?",
          question: {
            type: "choice",
            options: ["One to the callsign and one to the battery", "One to the drone's data and one to the vtable of its Drone methods", "One to the heap and one to the stack", "One to the next drone and one to the previous"],
            answer: 1,
          },
          explanation: "The data pointer finds the value; the vtable pointer finds the code to run for this type's version of each trait method.",
        },
      ],
    },
    // ───────────────────────── 6 ─────────────────────────
    {
      id: "rust-traits-6-choice",
      title: "dyn or generics?",
      minutes: 40,
      xp: 160,
      concepts: ["static vs dynamic dispatch", "generic struct", "struct holding Box<dyn>", "dyn compatibility (object safety)", "E0038"],
      learn: md`### Two ways to say "any drone"

You now have two tools for "works with anything that is a Drone", and they behave very differently. Concrete first. A landing **pad** that holds one drone, written two ways.

**Generics.** The pad remembers exactly which kind it holds:

~~~rust
struct Pad<T: Drone> {
    number: u32,
    occupant: T,
}

impl<T: Drone> Pad<T> {
    fn label(&self) -> String {
        format!("pad {}: {}", self.number, self.occupant.callsign())
    }
}
~~~

\`Pad<T: Drone>\` is a generic **struct**: the \`T\` is chosen when you make one, so \`Pad<Sparrow>\` and \`Pad<Heron>\` are two different types (and the compiler writes a separate copy of \`label\` for each, as in lesson 3). Because the type is known, there is no look-up and no pointer.

**Trait objects.** A hangar holds whatever you park in it:

~~~rust
struct Hangar {
    bays: Vec<Box<dyn Drone>>,
}

impl Hangar {
    fn new() -> Hangar { Hangar { bays: Vec::new() } }
    fn park(&mut self, d: Box<dyn Drone>) { self.bays.push(d); }
    fn total_charge(&self) -> u32 { self.bays.iter().map(|d| d.battery()).sum() }
}
~~~

A \`Hangar\` is a single type and its bays take any mix.

### How to choose

| Question | Generics | dyn |
| --- | --- | --- |
| Is every item the same kind, known at compile time? | yes: use \`T\` | works, but needless |
| Do you need one list with different kinds mixed? | impossible | the reason it exists |
| Dispatch | static: chosen at compile time, can be inlined | dynamic: one vtable look-up per call |
| Program size | one copy per type used | one copy |
| What can you call? | everything the bounds allow | only the trait's methods |

A practical rule of thumb: **start with generics. Reach for \`dyn\` when you need a mixed collection, a field whose kind is chosen while the program runs, or you want to keep the compiled program small.** Neither is "the good one". A pad for a specific model is a good generic. A hangar full of unlike drones is a good trait object.

### Not every trait can be made into an object: E0038

A vtable has to be built once for the trait, so every method must be callable without knowing the concrete type. Two things break that. First, a method that returns \`Self\`:

~~~rust
trait Cloner {
    fn twin(&self) -> Self;
}
~~~

~~~text
error[E0038]: the trait \`Cloner\` is not dyn compatible
    |
    |     let v: Vec<Box<dyn Cloner>> = vec![Box::new(Sparrow { tag: 1, battery: 2 })];
    |                        ^^^^^^ \`Cloner\` is not dyn compatible
    |
note: ...because method \`twin\` references the \`Self\` type in its return type
~~~

Through a \`Box<dyn Cloner>\` nobody knows what \`Self\` is, so nobody knows how big the result is. Second, a method with its own type parameter (\`fn charge_with<T: Display>(&self, source: T)\`) would need a different vtable entry for every \`T\`: the error says "...because method \`charge_with\` has generic type parameters". Older books call this property **object safety**; the compiler now says **dyn compatible**. It is the same thing.

Notice the compiler even says what to do: *consider moving the method to another trait*. The trait you use as \`dyn\` should hold only the methods that make sense without knowing the type. Your \`Drone\` trait is fine: both methods take \`&self\` and return ordinary types.

### Common mistakes

- Choosing \`dyn\` out of habit when every item is the same kind.
- Choosing generics and then wondering why you cannot put a Pad<Sparrow> and a Pad<Heron> in the same Vec (they are two types).
- Adding a method that returns \`Self\` to a trait you also want to box.`,
      mission: md`The harbour has two kinds of storage. Fixed **pads**, each reserved for one model, and a shared **hangar** where any drone can be parked. Build both, then ask the hangar for its total charge.

Pads show you generics, the hangar shows you trait objects, and the board puts the two designs side by side.`,
      tasks: [
        "Above the divider write struct Pad<T: Drone> { number: u32, occupant: T } with impl<T: Drone> Pad<T> { fn label(&self) -> String } returning format!(\"pad {}: {}\", self.number, self.occupant.callsign())",
        "Write struct Hangar { bays: Vec<Box<dyn Drone>> } with fn new() -> Hangar, fn park(&mut self, d: Box<dyn Drone>), fn total_charge(&self) -> u32 (sum of the batteries) and fn callsigns(&self) -> Vec<String>",
        "In main make pad_one = Pad { number: 1, occupant: Sparrow { tag: 21, battery: 70 } } and pad_two = Pad { number: 2, occupant: Heron { tag: 22, battery: 50, lift_kg: 8 } }, and print both labels",
        "Make let mut hangar = Hangar::new(); and park Sparrow-23 (battery 60), Glider-24 (45) and Heron-25 (35, lift_kg 11) in that order",
        "Print Hangar holds 3 drones, total charge 140% and Hangar callsigns: Sparrow-23, Glider-24, Heron-25, then send scene(\"choice\", ...) with pads (the two labels), bays (count), totalCharge and callsigns",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: generics or dyn? Above main:
//   struct Pad<T: Drone> { number: u32, occupant: T }     impl<T: Drone> Pad<T> { fn label(&self) -> String }      "pad 1: Sparrow-21"
//   struct Hangar { bays: Vec<Box<dyn Drone>> }   impl Hangar { fn new(), fn park(&mut self, d: Box<dyn Drone>), fn total_charge(&self) -> u32, fn callsigns(&self) -> Vec<String> }
${MAIN_DIVIDER}
// let pad_one = Pad { number: 1, occupant: Sparrow { tag: 21, battery: 70 } };   let pad_two = Pad { number: 2, occupant: Heron { tag: 22, battery: 50, lift_kg: 8 } };
// print both labels:    pad 1: Sparrow-21      pad 2: Heron-22
// let mut hangar = Hangar::new();   park Sparrow-23 (60), Glider-24 (45), Heron-25 (35, lift_kg 11)
// print  Hangar holds 3 drones, total charge 140%      Hangar callsigns: Sparrow-23, Glider-24, Heron-25
// scene("choice", Json::new().with("pads", vec![pad_one.label(), pad_two.label()]).with("bays", hangar.bays.len()).with("totalCharge", ..).with("callsigns", hangar.callsigns()));
`,
      solutionAdd: rs`struct Pad<T: Drone> {
    number: u32,
    occupant: T,
}

impl<T: Drone> Pad<T> {
    fn label(&self) -> String {
        format!("pad {}: {}", self.number, self.occupant.callsign())
    }
}

struct Hangar {
    bays: Vec<Box<dyn Drone>>,
}

impl Hangar {
    fn new() -> Hangar {
        Hangar { bays: Vec::new() }
    }

    fn park(&mut self, d: Box<dyn Drone>) {
        self.bays.push(d);
    }

    fn total_charge(&self) -> u32 {
        self.bays.iter().map(|d| d.battery()).sum()
    }

    fn callsigns(&self) -> Vec<String> {
        self.bays.iter().map(|d| d.callsign()).collect()
    }
}
${MAIN_DIVIDER}
// Lesson 6: a pad per model (generics), one hangar for everything (dyn).
let pad_one = Pad { number: 1, occupant: Sparrow { tag: 21, battery: 70 } };
let pad_two = Pad { number: 2, occupant: Heron { tag: 22, battery: 50, lift_kg: 8 } };
println!("{}", pad_one.label());
println!("{}", pad_two.label());

let mut hangar = Hangar::new();
hangar.park(Box::new(Sparrow { tag: 23, battery: 60 }));
hangar.park(Box::new(Glider { tag: 24, battery: 45 }));
hangar.park(Box::new(Heron { tag: 25, battery: 35, lift_kg: 11 }));
println!("Hangar holds {} drones, total charge {}%", hangar.bays.len(), hangar.total_charge());
println!("Hangar callsigns: {}", hangar.callsigns().join(", "));

scene(
    "choice",
    Json::new()
        .with("pads", vec![pad_one.label(), pad_two.label()])
        .with("bays", hangar.bays.len())
        .with("totalCharge", hangar.total_charge())
        .with("callsigns", hangar.callsigns()),
);`,
      explanation:
        "Pad<T: Drone> is a generic struct: each Pad<Sparrow> or Pad<Heron> is its own type, resolved at compile time. Hangar stores Vec<Box<dyn Drone>>, so one type holds any mix, at the cost of a vtable look-up per call. Both only use what Drone promises (callsign and battery). A trait whose methods return Self or have their own type parameters could not be a dyn type: that is error E0038.",
      hints: [
        { id: "h1", title: "The generic pad", content: "struct Pad<T: Drone> { number: u32, occupant: T } impl<T: Drone> Pad<T> { fn label(&self) -> String { format!(\"pad {}: {}\", self.number, self.occupant.callsign()) } } Note impl<T: Drone> Pad<T>: the T is declared after impl too." },
        { id: "h2", title: "The hangar", content: "struct Hangar { bays: Vec<Box<dyn Drone>> } impl Hangar { fn new() -> Hangar { Hangar { bays: Vec::new() } } fn park(&mut self, d: Box<dyn Drone>) { self.bays.push(d); } fn total_charge(&self) -> u32 { self.bays.iter().map(|d| d.battery()).sum() } ... }" },
        { id: "h3", title: "Parking", content: "let mut hangar = Hangar::new(); hangar.park(Box::new(Sparrow { tag: 23, battery: 60 })); and the same for Glider (tag 24, battery 45) and Heron (tag 25, battery 35, lift_kg 11). The charge is 60 + 45 + 35 = 140." },
      ],
      tests: [
        {
          id: "t1",
          description: "The pads are generic, each reserved for one model",
          assertionCode: js`
assert(lines.includes("pad 1: Sparrow-21"), 'No line is exactly "pad 1: Sparrow-21". Pad<T: Drone>::label should be format!("pad {}: {}", self.number, self.occupant.callsign()).');
assert(lines.includes("pad 2: Heron-22"), 'No line is exactly "pad 2: Heron-22". The same Pad<T> works for a Heron: Pad { number: 2, occupant: Heron { ... } }.');`,
        },
        {
          id: "t2",
          description: "The hangar mixes kinds as trait objects",
          assertionCode: js`
assert(lines.includes("Hangar holds 3 drones, total charge 140%"), 'No line is exactly "Hangar holds 3 drones, total charge 140%". Park three Box<dyn Drone> (batteries 60, 45, 35) and sum them in total_charge.');
assert(lines.includes("Hangar callsigns: Sparrow-23, Glider-24, Heron-25"), 'No line is exactly "Hangar callsigns: Sparrow-23, Glider-24, Heron-25". Park them in that order and join the callsigns with ", ".');`,
        },
        {
          id: "t3",
          description: "The board compares the two designs",
          assertionCode: js`
const c = scene.choice;
assert(c && typeof c === "object", 'Send scene("choice", Json::new()...).');
assertEqual(c.pads, ["pad 1: Sparrow-21", "pad 2: Heron-22"], '"pads" should hold the two pad labels.');
assertEqual(c.bays, 3, '"bays" should be the number of drones in the hangar (3).');
assertEqual(c.totalCharge, 140, '"totalCharge" should be 140.');
assertEqual(c.callsigns, ["Sparrow-23", "Glider-24", "Heron-25"], '"callsigns" should list the hangar callsigns in parking order.');`,
        },
      ],
      unlocks: ["df-choice"],
      checks: [
        {
          prompt: "You need one `Vec` that holds Sparrows, Herons and Gliders mixed together. Which fits?",
          question: {
            type: "choice",
            options: ["`Vec<T>` with `T: Drone`", "`Vec<Box<dyn Drone>>`", "`Vec<Drone>`", "`Vec<impl Drone>`"],
            answer: 1,
          },
          explanation: "`T` is one concrete type per Vec, so only a boxed trait object can hold different kinds side by side.",
        },
        {
          prompt: "Why does a trait with `fn twin(&self) -> Self;` fail when you write `Box<dyn Cloner>`? Give the error code.",
          question: { type: "text", answer: ["E0038", "e0038"] },
          explanation: "`E0038`: the trait is not dyn compatible (older name: object safe). A method that returns `Self` cannot go in a vtable because nobody knows `Self`'s size behind the box.",
        },
      ],
    },
    // ───────────────────────── 7 ─────────────────────────
    {
      id: "rust-traits-7-derives",
      title: "Derive, Debug and Display",
      minutes: 35,
      xp: 140,
      concepts: ["derive", "Debug", "Clone", "PartialEq", "Display", "impl fmt::Display", "E0277", "E0369"],
      learn: md`### You have been using traits all along

In Corvid Peak you wrote \`#[derive(Debug)]\`, \`impl Display\` and \`==\` without calling them traits. They were. This lesson shows that **everyday Rust features are traits**, so everything you learned in chapter 1 applies to them:

| You write | The trait behind it | The ability |
| --- | --- | --- |
| \`{:?}\` in a format string | \`Debug\` | "show me for the programmer" |
| \`{}\` in a format string | \`Display\` | "show me for people" |
| \`.clone()\` | \`Clone\` | "make an independent copy" |
| \`a == b\` | \`PartialEq\` | "can be compared for equality" |

### A new thing to ship: the Parcel

~~~rust
struct Parcel {
    id: u32,
    weight_kg: u32,
    fragile: bool,
}
~~~

Try to print it and the compiler complains, naming the trait you forgot:

~~~text
error[E0277]: \`Parcel\` doesn't implement \`Debug\`
   |
   |     println!("{:?}", p);
   |               ----   ^ \`Parcel\` cannot be formatted using \`{:?}\` because it doesn't implement \`Debug\`
help: consider annotating \`Parcel\` with \`#[derive(Debug)]\`
   |
   + #[derive(Debug)]
~~~

The same happens with \`==\`:

~~~text
error[E0369]: binary operation \`==\` cannot be applied to type \`Parcel\`
note: an implementation of \`PartialEq\` might be missing for \`Parcel\`
~~~

Every one of these is the lesson-3 rule in disguise: the feature has a hidden bound, and your type must satisfy it.

### derive: let the compiler write the impl

Writing \`impl Debug for Parcel\` by hand would mean listing every field. The **derive** attribute asks the compiler to write the obvious \`impl\` for you, field by field:

~~~rust
#[derive(Debug, Clone, PartialEq)]
struct Parcel { id: u32, weight_kg: u32, fragile: bool }

let parcel = Parcel { id: 17, weight_kg: 3, fragile: true };
let twin = parcel.clone();
let mut heavier = parcel.clone();
heavier.weight_kg = 9;
println!("{:?}", parcel);
println!("{}", parcel == twin);
println!("{}", parcel == heavier);
~~~

~~~text
Parcel { id: 17, weight_kg: 3, fragile: true }
true
false
~~~

\`{:#?}\` prints the same thing spread over several lines, handy for big structs. Remember: **derive only works if every field already has the trait.** A struct that holds a \`Parcel\` and derives \`Clone\` fails until \`Parcel\` is \`Clone\` too (error E0277, "the trait bound \`Parcel: Clone\` is not satisfied").

### Display is written by hand

\`Debug\` is for programmers, so Rust invents the format. \`Display\` is for people, so only *you* know how it should read, and there is no derive for it:

~~~rust
use std::fmt;

impl fmt::Display for Parcel {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "#{} ({} kg{})", self.id, self.weight_kg, if self.fragile { ", fragile" } else { "" })
    }
}

println!("{}", parcel);   // #17 (3 kg, fragile)
~~~

- \`use std::fmt;\` brings the formatting module's name in, so you can write \`fmt::Display\`.
- The one required method is \`fmt\`. It does not return text: it **writes** into \`f\`, a formatter, with the \`write!\` macro (like \`println!\`, but into \`f\`). The result type \`fmt::Result\` says whether that worked.
- Once \`Display\` exists, \`{}\` works, and so does \`.to_string()\` for free: the standard library gives every Display type that method.

### Common mistakes

- Reaching for \`{}\` on a struct and getting E0277: a struct has no Display until you write one.
- Deriving \`Clone\` on a struct that contains a non-Clone field.
- Writing a different signature for \`fmt\` (error E0053).`,
      mission: md`Every parcel at Skerry Post carries an id, a weight in kilograms and a "fragile" flag. The office clerk wants to **print** a parcel as a friendly label, the developers want to **debug-print** it, and the dispatcher needs to ask "is this the same parcel as that one?".

Define the Parcel with the derives it needs, write its friendly label by hand, and compare it with a clone and with a heavier one.`,
      tasks: [
        "Above the divider add use std::fmt; and #[derive(Debug, Clone, PartialEq)] struct Parcel { id: u32, weight_kg: u32, fragile: bool }",
        "Write impl fmt::Display for Parcel so it prints like #17 (3 kg, fragile), or #18 (2 kg) when not fragile (use write! and an if inside)",
        "In main make let parcel = Parcel { id: 17, weight_kg: 3, fragile: true }; let twin = parcel.clone(); and let mut heavier = parcel.clone(); then set heavier.weight_kg = 9;",
        "Print the Display form of parcel, then its Debug form ({:?}), then same as twin: true and same as heavier: false (use ==)",
        "Send scene(\"parcelCard\", ...) with display (parcel.to_string()), debug (format!(\"{:?}\", parcel)), equalToTwin and equalToHeavier",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: derive and Display. Above main:
//   use std::fmt;
//   #[derive(Debug, Clone, PartialEq)] struct Parcel { id: u32, weight_kg: u32, fragile: bool }
//   impl fmt::Display for Parcel { fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result { write!(f, "#{} ({} kg{})", ...) } }    "#17 (3 kg, fragile)"
${MAIN_DIVIDER}
// let parcel = Parcel { id: 17, weight_kg: 3, fragile: true };   let twin = parcel.clone();   let mut heavier = parcel.clone();   heavier.weight_kg = 9;
// print:  #17 (3 kg, fragile)
//         Parcel { id: 17, weight_kg: 3, fragile: true }
//         same as twin: true
//         same as heavier: false
// scene("parcelCard", Json::new().with("display", parcel.to_string()).with("debug", format!("{:?}", parcel)).with("equalToTwin", ..).with("equalToHeavier", ..));
`,
      solutionAdd: rs`use std::fmt;

#[derive(Debug, Clone, PartialEq)]
struct Parcel {
    id: u32,
    weight_kg: u32,
    fragile: bool,
}

impl fmt::Display for Parcel {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "#{} ({} kg{})", self.id, self.weight_kg, if self.fragile { ", fragile" } else { "" })
    }
}
${MAIN_DIVIDER}
// Lesson 7: derive and Display.
let parcel = Parcel { id: 17, weight_kg: 3, fragile: true };
let twin = parcel.clone();
let mut heavier = parcel.clone();
heavier.weight_kg = 9;

println!("{}", parcel);
println!("{:?}", parcel);
println!("same as twin: {}", parcel == twin);
println!("same as heavier: {}", parcel == heavier);

scene(
    "parcelCard",
    Json::new()
        .with("display", parcel.to_string())
        .with("debug", format!("{:?}", parcel))
        .with("equalToTwin", parcel == twin)
        .with("equalToHeavier", parcel == heavier),
);`,
      explanation:
        "#[derive(Debug, Clone, PartialEq)] asks the compiler to write those three impls field by field, which gives {:?}, .clone() and ==. Display has no derive because only you know how a parcel should read, so you implement fmt::Display by hand and write! into the formatter; that also gives .to_string(). The clone is equal to the original, but the heavier copy differs in weight_kg, so == is false.",
      hints: [
        { id: "h1", title: "The struct and its derives", content: "use std::fmt; #[derive(Debug, Clone, PartialEq)] struct Parcel { id: u32, weight_kg: u32, fragile: bool } Put them above fn main." },
        { id: "h2", title: "Display by hand", content: "impl fmt::Display for Parcel { fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result { write!(f, \"#{} ({} kg{})\", self.id, self.weight_kg, if self.fragile { \", fragile\" } else { \"\" }) } }" },
        { id: "h3", title: "Printing and comparing", content: "println!(\"{}\", parcel); println!(\"{:?}\", parcel); println!(\"same as twin: {}\", parcel == twin); For heavier use let mut heavier = parcel.clone(); heavier.weight_kg = 9;" },
      ],
      tests: [
        {
          id: "t1",
          description: "Display and Debug print the same parcel two ways",
          assertionCode: js`
assert(lines.includes("#17 (3 kg, fragile)"), 'No line is exactly "#17 (3 kg, fragile)". Write impl fmt::Display for Parcel with write!(f, "#{} ({} kg{})", ...) and print the parcel with {}.');
assert(lines.includes("Parcel { id: 17, weight_kg: 3, fragile: true }"), 'No line is exactly "Parcel { id: 17, weight_kg: 3, fragile: true }". Add #[derive(Debug)] and print the parcel with {:?}.');`,
        },
        {
          id: "t2",
          description: "PartialEq compares parcels field by field",
          assertionCode: js`
assert(lines.includes("same as twin: true"), 'No line is exactly "same as twin: true". Derive PartialEq and Clone, then print parcel == twin.');
assert(lines.includes("same as heavier: false"), 'No line is exactly "same as heavier: false". heavier is a clone with weight_kg changed to 9, so parcel == heavier is false.');`,
        },
        {
          id: "t3",
          description: "The board gets the parcel card",
          assertionCode: js`
const p = scene.parcelCard;
assert(p && typeof p === "object", 'Send scene("parcelCard", Json::new()...).');
assertEqual(p.display, "#17 (3 kg, fragile)", '"display" should be parcel.to_string() (the Display text).');
assertEqual(p.debug, "Parcel { id: 17, weight_kg: 3, fragile: true }", '"debug" should be format!("{:?}", parcel).');
assertEqual([p.equalToTwin, p.equalToHeavier], [true, false], '"equalToTwin" should be true and "equalToHeavier" false.');`,
        },
      ],
      unlocks: ["df-derives"],
      checks: [
        {
          prompt: "`println!(\"{:?}\", parcel)` fails with E0277 because `Parcel` has no ... what?",
          question: { type: "text", answer: ["Debug", "debug", "#[derive(Debug)]"] },
          explanation: "`{:?}` needs the `Debug` trait. `#[derive(Debug)]` above the struct writes the impl for you.",
        },
        {
          prompt: "Why is there no `#[derive(Display)]`?",
          question: {
            type: "choice",
            options: ["Display is deprecated", "Debug's layout is mechanical (field by field), but how a value should read for people is a choice only you can make", "Display needs unsafe code", "It exists, you just have to import it"],
            answer: 1,
          },
          explanation: "Derive can only produce mechanical output. A friendly label like `#17 (3 kg, fragile)` is your design, so you implement `fmt::Display` yourself.",
        },
      ],
    },
    // ───────────────────────── 8 ─────────────────────────
    {
      id: "rust-traits-8-conversions",
      title: "Default and From: making values the easy way",
      minutes: 35,
      xp: 140,
      concepts: ["Default", "derive(Default)", "struct update syntax", "From", "Into", "impl Into<T> argument", "T::default()"],
      learn: md`### Fresh from the box

When a new drone leaves the factory it has an id of zero and a full battery. When a new manifest sheet is opened it has no stops, no weight and is not marked as rush. Both are "the usual starting value", and asking for it should not require remembering every field. In Rust that starting value has a trait: **\`Default\`**, one method with no inputs:

~~~rust
impl Default for Sparrow {
    fn default() -> Sparrow {
        Sparrow { tag: 0, battery: 100 }
    }
}

let rookie = Sparrow::default();
~~~

When every field's own default is what you want (\`0\` for numbers, \`false\` for bool, an empty \`Vec\`), the compiler can write it for you:

~~~rust
#[derive(Debug, Default)]
struct Manifest {
    stops: Vec<String>,
    total_kg: u32,
    rush: bool,
}

let sheet = Manifest { rush: true, ..Default::default() };
println!("{:?}", sheet);      // Manifest { stops: [], total_kg: 0, rush: true }
~~~

The \`..Default::default()\` part is *struct update syntax*: "take every field I did not name from this other value". Here it gives a sheet that is only different where you said so.

Defaults also combine with generics: this function works for any type that has a starting value, which you can check against lesson 3's rule (the **bound** is what allows the call).

~~~rust
fn fresh<T: Default>() -> T {
    T::default()
}
let rookie: Sparrow = fresh();      // the annotation tells the compiler which T
~~~

### Turning one thing into another: From and Into

A passport office turns a visitor's papers into a visa. Rust has one trait for "I can build myself out of that": **\`From\`**.

~~~rust
impl From<(u32, u32)> for Parcel {
    fn from((id, weight_kg): (u32, u32)) -> Parcel {
        Parcel { id, weight_kg, fragile: false }
    }
}
~~~

Read the header as "Parcel can be made from a pair of numbers". The inputs are written with a tuple pattern right in the parameter list. Now both of these work:

~~~rust
let a = Parcel::from((21, 4));
let b: Parcel = (22, 8).into();
~~~

\`Into\` is **free**: once you write \`From\`, the standard library gives you the reverse direction, \`.into()\`. (You saw \`From\` give \`?\` its error conversion in Corvid Peak: same trait.) With \`.into()\` the compiler needs to know the target, so annotate it (\`let b: Parcel = ...\`).

The best use is on the *input* side of a function. If you ask for \`impl Into<Parcel>\`, callers may hand you a ready-made Parcel or anything that converts into one:

~~~rust
fn book(p: impl Into<Parcel>) -> String {
    let p: Parcel = p.into();
    format!("booked {}", p)
}

book((30, 2));              // booked #30 (2 kg)
book(parcel.clone());       // booked #17 (3 kg, fragile)   (a type converts into itself)
~~~

That works because \`impl Into<Parcel>\` is a trait bound like the ones from chapter 1.

### Common mistakes

- Using \`.into()\` with no annotation (E0282/E0283 "type annotations needed").
- Writing \`impl Into\` by hand: write \`From\` and get \`Into\` for free.
- Deriving \`Default\` on a struct with a field whose type has none.`,
      mission: md`Orders reach the office in rough shapes: sometimes a ready Parcel, sometimes just an id and a weight. New drones and fresh manifest sheets always start the same way. Teach your types their starting values and their conversions, and the rest of the code stops repeating field lists.

Use the Parcel from the last lesson and add a manifest sheet.`,
      tasks: [
        "Above the divider write impl Default for Sparrow (tag 0, battery 100), and fn fresh<T: Default>() -> T { T::default() }",
        "Add #[derive(Debug, Default)] struct Manifest { stops: Vec<String>, total_kg: u32, rush: bool } and impl From<(u32, u32)> for Parcel (id, weight_kg, fragile false)",
        "Add impl From<&Parcel> for Manifest (stops: vec![format!(\"#{}\", p.id)], total_kg: p.weight_kg, rush: false) and fn book(p: impl Into<Parcel>) -> String returning format!(\"booked {}\", ...) with the parcel's Display text",
        "In main print Fresh sparrow: Sparrow-0 at 100% (let rookie: Sparrow = fresh(); with power_line), Sheet: Manifest { stops: [], total_kg: 0, rush: true } (rush: true, ..Default::default()), and Converted: #21 (4 kg) (let a: Parcel = (21, 4).into();)",
        "Print Booked: booked #30 (2 kg) for book((30, 2)) and Booked: booked #17 (3 kg, fragile) for book(parcel.clone()); then the Manifest of &parcel with {:?}",
        "Send scene(\"conversions\", ...): records with via and result for Default, derive(Default), From<(u32, u32)>, Into<Parcel> and From<&Parcel>",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: Default and From. Above main:
//   impl Default for Sparrow { tag 0, battery 100 }       fn fresh<T: Default>() -> T { T::default() }
//   #[derive(Debug, Default)] struct Manifest { stops: Vec<String>, total_kg: u32, rush: bool }
//   impl From<(u32, u32)> for Parcel { ... }              impl From<&Parcel> for Manifest { stops: vec![format!("#{}", p.id)], total_kg: p.weight_kg, rush: false }
//   fn book(p: impl Into<Parcel>) -> String               format!("booked {}", parcel)
${MAIN_DIVIDER}
// let rookie: Sparrow = fresh();                                  print  Fresh sparrow: Sparrow-0 at 100%        (power_line(&rookie))
// let sheet = Manifest { rush: true, ..Default::default() };        print  Sheet: Manifest { stops: [], total_kg: 0, rush: true }
// let converted: Parcel = (21, 4).into();                           print  Converted: #21 (4 kg)
// print  Booked: booked #30 (2 kg)     Booked: booked #17 (3 kg, fragile)       and       Manifest::from(&parcel) with {:?}
// scene("conversions", vec![ Json::new().with("via", "Default").with("result", ..), ... five records ... ]);
`,
      solutionAdd: rs`impl Default for Sparrow {
    fn default() -> Sparrow {
        Sparrow { tag: 0, battery: 100 }
    }
}

fn fresh<T: Default>() -> T {
    T::default()
}

#[derive(Debug, Default)]
struct Manifest {
    stops: Vec<String>,
    total_kg: u32,
    rush: bool,
}

impl From<(u32, u32)> for Parcel {
    fn from((id, weight_kg): (u32, u32)) -> Parcel {
        Parcel { id, weight_kg, fragile: false }
    }
}

impl From<&Parcel> for Manifest {
    fn from(p: &Parcel) -> Manifest {
        Manifest { stops: vec![format!("#{}", p.id)], total_kg: p.weight_kg, rush: false }
    }
}

fn book(p: impl Into<Parcel>) -> String {
    let p: Parcel = p.into();
    format!("booked {}", p)
}
${MAIN_DIVIDER}
// Lesson 8: Default and From.
let rookie: Sparrow = fresh();
let rookie_line = power_line(&rookie);
println!("Fresh sparrow: {}", rookie_line);

let sheet = Manifest { rush: true, ..Default::default() };
let sheet_text = format!("{:?}", sheet);
println!("Sheet: {}", sheet_text);

let converted: Parcel = (21, 4).into();
println!("Converted: {}", converted);

let booked_pair = book((30, 2));
let booked_whole = book(parcel.clone());
println!("Booked: {}", booked_pair);
println!("Booked: {}", booked_whole);

let manifest_of = Manifest::from(&parcel);
let manifest_text = format!("{:?}", manifest_of);
println!("{}", manifest_text);

scene(
    "conversions",
    vec![
        Json::new().with("via", "Default").with("result", rookie_line),
        Json::new().with("via", "derive(Default)").with("result", sheet_text),
        Json::new().with("via", "From<(u32, u32)>").with("result", converted.to_string()),
        Json::new().with("via", "Into<Parcel>").with("result", booked_pair),
        Json::new().with("via", "From<&Parcel>").with("result", manifest_text),
    ],
);`,
      explanation:
        "Default gives a type its usual starting value: by hand for Sparrow, derived for Manifest (every field defaults to zero, empty or false), and fresh<T: Default>() works for any type with that bound. From<(u32, u32)> for Parcel says how to build a Parcel from a pair, and the standard library gives .into() for free. book takes impl Into<Parcel>, so it accepts both a pair and a ready-made Parcel (a type converts into itself).",
      hints: [
        { id: "h1", title: "Default", content: "impl Default for Sparrow { fn default() -> Sparrow { Sparrow { tag: 0, battery: 100 } } } and fn fresh<T: Default>() -> T { T::default() }. For Manifest, #[derive(Debug, Default)] is enough." },
        { id: "h2", title: "From", content: "impl From<(u32, u32)> for Parcel { fn from((id, weight_kg): (u32, u32)) -> Parcel { Parcel { id, weight_kg, fragile: false } } } and impl From<&Parcel> for Manifest { fn from(p: &Parcel) -> Manifest { Manifest { stops: vec![format!(\"#{}\", p.id)], total_kg: p.weight_kg, rush: false } } }" },
        { id: "h3", title: "book and main", content: "fn book(p: impl Into<Parcel>) -> String { let p: Parcel = p.into(); format!(\"booked {}\", p) } In main: let rookie: Sparrow = fresh(); let converted: Parcel = (21, 4).into(); let sheet = Manifest { rush: true, ..Default::default() };" },
      ],
      tests: [
        {
          id: "t1",
          description: "Default makes a fresh sparrow and a rush sheet",
          assertionCode: js`
assert(lines.includes("Fresh sparrow: Sparrow-0 at 100%"), 'No line is exactly "Fresh sparrow: Sparrow-0 at 100%". impl Default for Sparrow (tag 0, battery 100), then let rookie: Sparrow = fresh(); and print power_line(&rookie).');
assert(lines.includes("Sheet: Manifest { stops: [], total_kg: 0, rush: true }"), 'No line is exactly "Sheet: Manifest { stops: [], total_kg: 0, rush: true }". Derive Debug and Default for Manifest and build it with Manifest { rush: true, ..Default::default() }.');`,
        },
        {
          id: "t2",
          description: "From and Into convert a pair into a Parcel",
          assertionCode: js`
assert(lines.includes("Converted: #21 (4 kg)"), 'No line is exactly "Converted: #21 (4 kg)". impl From<(u32, u32)> for Parcel, then let converted: Parcel = (21, 4).into(); and print it with {}.');
assert(lines.includes("Booked: booked #30 (2 kg)"), 'No line is exactly "Booked: booked #30 (2 kg)". book(p: impl Into<Parcel>) converts with p.into() and prints format!("booked {}", p).');
assert(lines.includes("Booked: booked #17 (3 kg, fragile)"), 'No line is exactly "Booked: booked #17 (3 kg, fragile)". book(parcel.clone()) must work too: every type converts into itself.');`,
        },
        {
          id: "t3",
          description: "The board lists the five ways values were made",
          assertionCode: js`
const c = scene.conversions;
assert(Array.isArray(c) && c.length === 5, 'Send scene("conversions", vec![...]) with five records.');
assertEqual(c.map((x) => x.via), ["Default", "derive(Default)", "From<(u32, u32)>", "Into<Parcel>", "From<&Parcel>"], 'The "via" values should be Default, derive(Default), From<(u32, u32)>, Into<Parcel>, From<&Parcel>.');
assertEqual(c[0].result, "Sparrow-0 at 100%", "The first result is the fresh sparrow's power line.");
assertEqual(c[4].result, 'Manifest { stops: ["#17"], total_kg: 3, rush: false }', "The last result is the Debug text of Manifest::from(&parcel).");`,
        },
      ],
      unlocks: ["df-convert"],
      checks: [
        {
          prompt: "You write `impl From<(u32, u32)> for Parcel`. What do you get without writing it?",
          question: {
            type: "choice",
            options: ["Nothing extra", "The matching `.into()`: `(21, 4).into()` can produce a Parcel", "A Display impl", "A Default impl"],
            answer: 1,
          },
          explanation: "The standard library implements `Into<Parcel>` for every type that `Parcel` can be made `From`. Implement `From`, never `Into`.",
        },
        {
          prompt: "What does `..Default::default()` mean inside a struct literal?",
          question: {
            type: "choice",
            options: ["Fill every field I did not name from the type's default value", "Delete the unnamed fields", "Copy the struct twice", "Make the struct generic"],
            answer: 0,
          },
          explanation: "It is struct update syntax: list only the fields that differ and take the rest from another value (here, the default).",
        },
      ],
    },
  ],
};
