import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 3: Routes and readouts. Operator overloading (Add, Sub, Mul, Neg, Index), ordering (derive and by
 * hand), implementing Iterator with an associated type, and adaptors on your own iterator.
 */

export const chapter3: Chapter = {
  id: "routes-and-readouts",
  title: "Routes and readouts",
  blurb: "Make +, - and [] work on your own types, teach the fleet to rank itself, and write an iterator so every adaptor you know works on it.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "rust-traits-9-operators",
      title: "Operators are traits",
      minutes: 40,
      xp: 160,
      concepts: ["Add", "Sub", "Mul<i32>", "Neg", "Index", "associated type Output", "Copy", "E0369", "E0382"],
      learn: md`### Adding two positions

The harbour map is a grid. A position is two whole numbers, \`x\` (east) and \`y\` (north), and the dispatcher keeps doing the same sums with them: "the flight vector from the depot to an island", "twice that for the round trip", "the way back". On paper you would write \`isle - depot\`. Here is the type, and the concrete way to do the sum with an ordinary function:

~~~rust
#[derive(Debug, Clone, Copy, PartialEq)]
struct Pos { x: i32, y: i32 }

fn add_pos(a: Pos, b: Pos) -> Pos {
    Pos { x: a.x + b.x, y: a.y + b.y }
}
~~~

That works, but \`add_pos(add_pos(a, b), c)\` reads badly. What you want is \`a + b + c\`. Try it on a struct that did nothing special and the compiler says:

~~~text
error[E0369]: cannot add \`Pos\` to \`Pos\`
  |
  |     let c = a + b;
  |             - ^ - Pos
  |             |
  |             Pos
note: an implementation of \`Add\` might be missing for \`Pos\`
~~~

The message names the trait. The key idea of this lesson: **an operator is just a trait method with a pretty spelling.** \`a + b\` is the method call \`Add::add(a, b)\`, and the same for the others:

| You write | Trait | Method |
| --- | --- | --- |
| \`a + b\` | \`Add\` | \`add\` |
| \`a - b\` | \`Sub\` | \`sub\` |
| \`a * k\` | \`Mul\` | \`mul\` |
| \`-a\` | \`Neg\` | \`neg\` |
| \`route[i]\` | \`Index\` | \`index\` |

So to give your own type an operator, you implement the trait, exactly as in chapter 1.

### Writing Add

~~~rust
use std::ops::Add;

impl Add for Pos {
    type Output = Pos;

    fn add(self, other: Pos) -> Pos {
        Pos { x: self.x + other.x, y: self.y + other.y }
    }
}
~~~

There is one new line: \`type Output = Pos;\`. It is an **associated type**: a blank on the trait's form that each impl fills in. \`Add\` does not know in advance what adding two things produces (adding two lengths gives a length, adding a date and a duration gives a date), so each impl states it, and \`add\`'s return type uses it. For positions, adding two positions gives a position.

\`Sub\` and \`Neg\` have the same shape (\`Neg\` has no second operand: \`fn neg(self) -> Pos\`). **\`Mul<i32>\`** shows that operator traits can take a type in angle brackets: \`impl Mul<i32> for Pos\` means "a Pos times a whole number", so \`leg * 2\` works. It also means other combinations do not:

~~~text
error[E0277]: cannot multiply \`{integer}\` by \`Pos\`
  |     let c = 2 * a;
  |               ^ no implementation for \`{integer} * Pos\`
~~~

\`2 * a\` is a different impl (\`Mul<Pos> for i32\`) from \`a * 2\`. Nobody wrote it, so it is refused.

### Why Copy?

Operator methods take \`self\` **by value**, which moves the operand into the call. If \`Pos\` could not be copied, the first sum would use the values up:

~~~text
error[E0382]: use of moved value: \`a\`
  |     let c = a + b;
  |             ----- \`a\` moved due to usage in operator
  |     let d = a + c;
  |             ^ value used here after move
  = note: calling this operator moves the left-hand side
~~~

The fix is \`Copy\`: a marker trait that says "this value is tiny, just duplicate its bytes whenever it is used, like a number". The derive line \`#[derive(Debug, Clone, Copy, PartialEq)]\` gives \`Pos\` exactly that, and \`a + b\` leaves \`a\` and \`b\` usable. (Only derive \`Copy\` on small plain data; a \`String\` or a \`Vec\` cannot be \`Copy\`.)

### Index: the square brackets

A **route** is a list of stops. Wrapping a \`Vec\` in a one-field tuple struct (\`struct Route(Vec<Pos>);\`) gives it its own type to attach behaviour to, and \`Index\` makes \`route[2]\` work:

~~~rust
use std::ops::Index;

struct Route(Vec<Pos>);

impl Index<usize> for Route {
    type Output = Pos;
    fn index(&self, i: usize) -> &Pos {
        &self.0[i]
    }
}
~~~

\`Index<usize>\` says "you can index me with a \`usize\`". \`Output\` is what you get back, and \`index\` returns a **reference** to it (\`&Pos\`), because \`route[2]\` must be able to *look at* the stop without taking it out of the route. \`self.0\` is the tuple struct's first (and only) field. Asking for a stop past the end panics, exactly as a \`Vec\` would.

### Putting a number on it

A drone follows streets, not diagonals, so the distance between two positions counts east-west steps plus north-south steps:

~~~rust
impl Pos {
    fn distance(self, other: Pos) -> i32 {
        let d = other - self;
        d.x.abs() + d.y.abs()
    }
}
~~~

(That uses \`Sub\`, the operator you just wrote.)

### Common mistakes

- Forgetting \`type Output\` (E0046, "missing: \`Output\`").
- Forgetting \`Copy\` and getting "use of moved value" after the first \`+\`.
- Expecting \`2 * pos\` to work because \`pos * 2\` does.`,
      mission: md`Skerry Post has a map at last. The depot is at (0, 0), the first island at (3, 4) and a reef outpost at (7, -2). Teach your position type to subtract, scale and negate, put a route on the map, and ask it for its third stop.

The board draws the harbour grid with every vector you compute.`,
      tasks: [
        "Above the divider add use std::ops::{Add, Index, Mul, Neg, Sub}; and #[derive(Debug, Clone, Copy, PartialEq)] struct Pos { x: i32, y: i32 }",
        "Implement Add and Sub for Pos (type Output = Pos; field by field), Mul<i32> for Pos (scales both fields) and Neg for Pos (flips both signs)",
        "Add impl Pos { fn distance(self, other: Pos) -> i32 } (east-west plus north-south steps, using the - operator), struct Route(Vec<Pos>); with impl Index<usize> for Route, and fn xy(p: Pos) -> Vec<i32> returning vec![p.x, p.y]",
        "In main make depot (0, 0), isle (3, 4) and reef (7, -2), then let leg = isle - depot; let round_trip = leg * 2; let home = -leg; let landing = depot + leg + Pos { x: 1, y: 1 }; and let route = Route(vec![depot, isle, reef]);",
        "Print Leg to the isle, Round trip, Way home and Landing with {:?} (for example Leg to the isle: Pos { x: 3, y: 4 }), then Distance depot to reef: 9 and Third stop on the route: Pos { x: 7, y: -2 } (route[2])",
        "Send scene(\"harbour\", ...) with depot, isle, reef, leg, roundTrip, home, landing (each as xy(...)), route (a vec of xy for each stop) and distanceToReef",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: operators are traits. Above main:
//   use std::ops::{Add, Index, Mul, Neg, Sub};
//   #[derive(Debug, Clone, Copy, PartialEq)] struct Pos { x: i32, y: i32 }
//   impl Add for Pos / impl Sub for Pos / impl Mul<i32> for Pos / impl Neg for Pos     (each: type Output = Pos;)
//   impl Pos { fn distance(self, other: Pos) -> i32 }       east-west steps + north-south steps
//   struct Route(Vec<Pos>);   impl Index<usize> for Route { type Output = Pos; fn index(&self, i: usize) -> &Pos { &self.0[i] } }
//   fn xy(p: Pos) -> Vec<i32>
${MAIN_DIVIDER}
// let depot = Pos { x: 0, y: 0 };  let isle = Pos { x: 3, y: 4 };  let reef = Pos { x: 7, y: -2 };
// let leg = isle - depot;  let round_trip = leg * 2;  let home = -leg;  let landing = depot + leg + Pos { x: 1, y: 1 };  let route = Route(vec![depot, isle, reef]);
// print  Leg to the isle: Pos { x: 3, y: 4 }   Round trip: ...   Way home: ...   Landing: ...   Distance depot to reef: 9   Third stop on the route: Pos { x: 7, y: -2 }
// scene("harbour", Json::new().with("depot", xy(depot)) ... .with("route", vec![xy(route[0]), xy(route[1]), xy(route[2])]).with("distanceToReef", depot.distance(reef)));
`,
      solutionAdd: rs`use std::ops::{Add, Index, Mul, Neg, Sub};

#[derive(Debug, Clone, Copy, PartialEq)]
struct Pos {
    x: i32,
    y: i32,
}

impl Add for Pos {
    type Output = Pos;
    fn add(self, other: Pos) -> Pos {
        Pos { x: self.x + other.x, y: self.y + other.y }
    }
}

impl Sub for Pos {
    type Output = Pos;
    fn sub(self, other: Pos) -> Pos {
        Pos { x: self.x - other.x, y: self.y - other.y }
    }
}

impl Mul<i32> for Pos {
    type Output = Pos;
    fn mul(self, k: i32) -> Pos {
        Pos { x: self.x * k, y: self.y * k }
    }
}

impl Neg for Pos {
    type Output = Pos;
    fn neg(self) -> Pos {
        Pos { x: -self.x, y: -self.y }
    }
}

impl Pos {
    fn distance(self, other: Pos) -> i32 {
        let d = other - self;
        d.x.abs() + d.y.abs()
    }
}

struct Route(Vec<Pos>);

impl Index<usize> for Route {
    type Output = Pos;
    fn index(&self, i: usize) -> &Pos {
        &self.0[i]
    }
}

fn xy(p: Pos) -> Vec<i32> {
    vec![p.x, p.y]
}
${MAIN_DIVIDER}
// Lesson 9: operators on positions.
let depot = Pos { x: 0, y: 0 };
let isle = Pos { x: 3, y: 4 };
let reef = Pos { x: 7, y: -2 };

let leg = isle - depot;
let round_trip = leg * 2;
let home = -leg;
let landing = depot + leg + Pos { x: 1, y: 1 };
let route = Route(vec![depot, isle, reef]);

println!("Leg to the isle: {:?}", leg);
println!("Round trip: {:?}", round_trip);
println!("Way home: {:?}", home);
println!("Landing: {:?}", landing);
println!("Distance depot to reef: {}", depot.distance(reef));
println!("Third stop on the route: {:?}", route[2]);

scene(
    "harbour",
    Json::new()
        .with("depot", xy(depot))
        .with("isle", xy(isle))
        .with("reef", xy(reef))
        .with("leg", xy(leg))
        .with("roundTrip", xy(round_trip))
        .with("home", xy(home))
        .with("landing", xy(landing))
        .with("route", vec![xy(route[0]), xy(route[1]), xy(route[2])])
        .with("distanceToReef", depot.distance(reef)),
);`,
      explanation:
        "a + b is Add::add(a, b), so implementing Add (with type Output = Pos) gives the operator, and Sub, Mul<i32> and Neg work the same way. Because those methods take self by value, Pos derives Copy so the operands stay usable. Index<usize> for Route makes route[2] a call to index, which returns a reference to the stop. distance uses the - operator you just wrote and adds the absolute east-west and north-south steps.",
      hints: [
        { id: "h1", title: "Add and Sub", content: "use std::ops::{Add, Index, Mul, Neg, Sub}; impl Add for Pos { type Output = Pos; fn add(self, other: Pos) -> Pos { Pos { x: self.x + other.x, y: self.y + other.y } } } and Sub is the same with the method sub and minus signs." },
        { id: "h2", title: "Mul, Neg, Index", content: "impl Mul<i32> for Pos { type Output = Pos; fn mul(self, k: i32) -> Pos { Pos { x: self.x * k, y: self.y * k } } } impl Neg for Pos { type Output = Pos; fn neg(self) -> Pos { Pos { x: -self.x, y: -self.y } } } impl Index<usize> for Route { type Output = Pos; fn index(&self, i: usize) -> &Pos { &self.0[i] } }" },
        { id: "h3", title: "distance and the scene", content: "impl Pos { fn distance(self, other: Pos) -> i32 { let d = other - self; d.x.abs() + d.y.abs() } } The harbour scene uses xy(...) for every position; route is vec![xy(route[0]), xy(route[1]), xy(route[2])]." },
      ],
      tests: [
        {
          id: "t1",
          description: "The operators give the flight vectors",
          assertionCode: js`
assert(lines.includes("Leg to the isle: Pos { x: 3, y: 4 }"), 'No line is exactly "Leg to the isle: Pos { x: 3, y: 4 }". isle - depot uses your impl Sub for Pos.');
assert(lines.includes("Round trip: Pos { x: 6, y: 8 }"), 'No line is exactly "Round trip: Pos { x: 6, y: 8 }". leg * 2 needs impl Mul<i32> for Pos.');
assert(lines.includes("Way home: Pos { x: -3, y: -4 }"), 'No line is exactly "Way home: Pos { x: -3, y: -4 }". -leg needs impl Neg for Pos.');
assert(lines.includes("Landing: Pos { x: 4, y: 5 }"), 'No line is exactly "Landing: Pos { x: 4, y: 5 }". depot + leg + Pos { x: 1, y: 1 } needs impl Add for Pos, and Copy so the operands survive.');`,
        },
        {
          id: "t2",
          description: "Distance and Index work",
          assertionCode: js`
assert(lines.includes("Distance depot to reef: 9"), 'No line is exactly "Distance depot to reef: 9". distance adds d.x.abs() + d.y.abs() of other - self.');
assert(lines.includes("Third stop on the route: Pos { x: 7, y: -2 }"), 'No line is exactly "Third stop on the route: Pos { x: 7, y: -2 }". route[2] needs impl Index<usize> for Route.');`,
        },
        {
          id: "t3",
          description: "The board gets the harbour grid",
          assertionCode: js`
const h = scene.harbour;
assert(h && typeof h === "object", 'Send scene("harbour", Json::new()...).');
assertEqual(h.leg, [3, 4], '"leg" should be [3, 4] (xy(leg)).');
assertEqual(h.roundTrip, [6, 8], '"roundTrip" should be [6, 8].');
assertEqual(h.home, [-3, -4], '"home" should be [-3, -4].');
assertEqual(h.landing, [4, 5], '"landing" should be [4, 5].');
assertEqual(h.route, [[0, 0], [3, 4], [7, -2]], '"route" should list the three stops as [x, y] pairs.');
assertEqual(h.distanceToReef, 9, '"distanceToReef" should be 9.');`,
        },
      ],
      unlocks: ["df-harbour"],
      checks: [
        {
          prompt: "What does `a - b` really call?",
          question: {
            type: "choice",
            options: ["A built-in that only works on numbers", "The method `sub` from the `Sub` trait, on a", "A function named minus", "Nothing: it is rewritten to a + (-b)"],
            answer: 1,
          },
          explanation: "Operators are sugar for trait methods: `a - b` is `Sub::sub(a, b)`. Implement `Sub` for your type and the operator works.",
        },
        {
          prompt: "What is `type Output = Pos;` inside `impl Add for Pos`?",
          question: {
            type: "choice",
            options: ["A local variable", "An associated type: the impl says what adding two Pos produces", "A lifetime", "A second trait"],
            answer: 1,
          },
          explanation: "`Add` leaves the result type open. Each impl fills in `Output`, and `add` returns it.",
        },
      ],
    },
    // ───────────────────────── 10 ─────────────────────────
    {
      id: "rust-traits-10-ordering",
      title: "Ordering: who comes first?",
      minutes: 40,
      xp: 160,
      concepts: ["PartialOrd", "Ord", "derive ordering", "cmp", "Ordering::then_with", "sort", "min/max", "f64 is not Ord", "E0277"],
      learn: md`### Several drones want the same job

When a job appears, each free drone sends a **bid**: its distance to the parcel and its remaining charge. The dispatcher wants the best bid first. "Best" means the *shortest distance*, and when two drones are equally near, the one with the *most battery*. Ranking things is what the **ordering traits** are for, and they are why \`sort()\`, \`min()\`, \`max()\` and the comparison operators \`<\`, \`>\` work.

There are two, and the difference matters:

- **\`PartialOrd\`** ("partial order"): any two values *may* be comparable. The method \`partial_cmp\` returns an \`Option<Ordering>\`, so it can answer "these two cannot be compared". The operators \`<\` \`<=\` \`>\` \`>=\` use it.
- **\`Ord\`** ("total order"): any two values *always* compare, so \`cmp\` returns a plain \`Ordering\`, which is one of \`Less\`, \`Equal\`, \`Greater\`. \`sort()\`, \`min()\` and \`max()\` require it.

Why have a "maybe" version? Because of \`f64\`. The decimal number \`NaN\` ("not a number", the result of 0.0 / 0.0) is neither bigger nor smaller than anything, so decimals are only \`PartialOrd\`. Try to sort them and the compiler tells you:

~~~text
error[E0277]: the trait bound \`{float}: Ord\` is not satisfied
  |     loads.sort();
  |           ^^^^ the trait \`Ord\` is not implemented for \`{float}\`
note: required by a bound in \`slice::<impl [T]>::sort\`
~~~

The cure is to say what to do for the impossible case: \`loads.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal))\`. \`sort_by\` takes a closure that returns an \`Ordering\`.

### Ordering by deriving: urgency levels

For a simple list of named levels, derive does it all. The order is the order you **write the variants**, first is smallest:

~~~rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Urgency { Economy, Standard, Rush }

Urgency::Economy < Urgency::Standard      // true
~~~

Four derives travel together: \`PartialEq\` and \`Eq\` ("equality that always makes sense", the same partial/total split) and \`PartialOrd\` and \`Ord\`. An ordering is built on an equality, so you cannot have one without the other.

### Ordering by hand: bids

A bid has a rule only you know, so write \`Ord\` yourself:

~~~rust
use std::cmp::Ordering;

#[derive(Debug, Clone, PartialEq, Eq)]
struct Bid { callsign: String, distance: i32, battery: u32 }

impl Ord for Bid {
    fn cmp(&self, other: &Bid) -> Ordering {
        self.distance
            .cmp(&other.distance)                               // nearer first
            .then_with(|| other.battery.cmp(&self.battery))    // then more battery first
            .then_with(|| self.callsign.cmp(&other.callsign))  // then by name, so ties are stable
    }
}

impl PartialOrd for Bid {
    fn partial_cmp(&self, other: &Bid) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
~~~

Read the chain: \`a.cmp(&b)\` gives an \`Ordering\`; \`.then_with(|| ...)\` says "if that was \`Equal\`, decide with this instead". Notice \`other.battery.cmp(&self.battery)\` has the two sides swapped: that is how you say "bigger battery sorts earlier". The very last line is not decoration: **your ordering must agree with your equality** (if \`cmp\` says \`Equal\`, then \`==\` must say true). Because \`PartialEq\` is derived over all three fields, the ordering must look at all three fields too.

\`PartialOrd\` by hand is always the same one-liner, "just use \`Ord\`'s answer", so it is worth writing once and not thinking about. After that the whole toolbox opens up:

~~~rust
bids.sort();                       // smallest (best) first
let best = bids.iter().min();      // Option<&Bid>
bids[0] < bids[3]                  // true when bid 0 ranks first
~~~

### Common mistakes

- Sorting \`f64\` with \`sort()\` (E0277). Use \`sort_by\` with \`partial_cmp\`.
- Writing \`Ord\` without \`PartialOrd\`, \`Eq\` or \`PartialEq\` (the compiler lists what is missing).
- Getting the direction backwards: to rank "bigger first", compare \`other\` with \`self\`.`,
      mission: md`Four drones bid for a rush job. Rank them with the rule the dispatcher gave you, ask for the best bid, and also sort the urgency levels and a list of parcel loads (decimal kilograms) so the board can show all three orderings.

You will use all of: derived ordering on an enum, hand-written \`Ord\` on a struct, and \`sort_by\` for decimals.`,
      tasks: [
        "Above the divider add use std::cmp::Ordering; and #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)] enum Urgency { Economy, Standard, Rush }",
        "Add #[derive(Debug, Clone, PartialEq, Eq)] struct Bid { callsign: String, distance: i32, battery: u32 } with impl Ord (distance ascending, then battery descending, then callsign) and impl PartialOrd (Some(self.cmp(other)))",
        "In main make let mut bids = vec![...] with Sparrow-31 (distance 12, battery 80), Heron-32 (5, 40), Glider-33 (12, 95) and Sparrow-34 (5, 70), then bids.sort();",
        "Print Bids in order: Sparrow-34, Heron-32, Glider-33, Sparrow-31 (join the callsigns), Best bid: Sparrow-34 (bids.iter().min()) and Sparrow-34 ranks before Sparrow-31: true (bids[0] < bids[3])",
        "Sort let mut levels = vec![Urgency::Standard, Urgency::Rush, Urgency::Economy]; and print Urgency order: [Economy, Standard, Rush] ({:?}) and Most urgent: Rush (levels.iter().max())",
        "Sort let mut loads = vec![2.5, 0.5, 1.0]; with sort_by and partial_cmp and print Loads sorted: [0.5, 1.0, 2.5]; then send scene(\"ranking\", ...) with bids (rank, callsign, distance, battery), best, urgencies (strings) and loads",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: ordering. Above main:
//   use std::cmp::Ordering;
//   #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)] enum Urgency { Economy, Standard, Rush }
//   #[derive(Debug, Clone, PartialEq, Eq)] struct Bid { callsign: String, distance: i32, battery: u32 }
//   impl Ord for Bid { fn cmp(&self, other: &Bid) -> Ordering { distance asc, then other.battery vs self.battery, then callsign } }
//   impl PartialOrd for Bid { fn partial_cmp(&self, other: &Bid) -> Option<Ordering> { Some(self.cmp(other)) } }
${MAIN_DIVIDER}
// let mut bids = vec![ Bid { callsign: "Sparrow-31".to_string(), distance: 12, battery: 80 }, Heron-32 (5, 40), Glider-33 (12, 95), Sparrow-34 (5, 70) ];   bids.sort();
// print  Bids in order: Sparrow-34, Heron-32, Glider-33, Sparrow-31      Best bid: Sparrow-34      Sparrow-34 ranks before Sparrow-31: true
// let mut levels = vec![Urgency::Standard, Urgency::Rush, Urgency::Economy];  levels.sort();    print  Urgency order: [Economy, Standard, Rush]    Most urgent: Rush
// let mut loads = vec![2.5, 0.5, 1.0];  loads.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));    print  Loads sorted: [0.5, 1.0, 2.5]
// scene("ranking", Json::new().with("bids", ...).with("best", ..).with("urgencies", ..).with("loads", loads));
`,
      solutionAdd: rs`use std::cmp::Ordering;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Urgency {
    Economy,
    Standard,
    Rush,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Bid {
    callsign: String,
    distance: i32,
    battery: u32,
}

impl Ord for Bid {
    fn cmp(&self, other: &Bid) -> Ordering {
        self.distance
            .cmp(&other.distance)
            .then_with(|| other.battery.cmp(&self.battery))
            .then_with(|| self.callsign.cmp(&other.callsign))
    }
}

impl PartialOrd for Bid {
    fn partial_cmp(&self, other: &Bid) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
${MAIN_DIVIDER}
// Lesson 10: ordering.
let mut bids = vec![
    Bid { callsign: "Sparrow-31".to_string(), distance: 12, battery: 80 },
    Bid { callsign: "Heron-32".to_string(), distance: 5, battery: 40 },
    Bid { callsign: "Glider-33".to_string(), distance: 12, battery: 95 },
    Bid { callsign: "Sparrow-34".to_string(), distance: 5, battery: 70 },
];
bids.sort();

let order: Vec<String> = bids.iter().map(|b| b.callsign.clone()).collect();
println!("Bids in order: {}", order.join(", "));
let best_bid = bids.iter().min().map(|b| b.callsign.clone()).unwrap_or_default();
println!("Best bid: {}", best_bid);
println!("{} ranks before {}: {}", bids[0].callsign, bids[3].callsign, bids[0] < bids[3]);

let mut levels = vec![Urgency::Standard, Urgency::Rush, Urgency::Economy];
levels.sort();
println!("Urgency order: {:?}", levels);
println!("Most urgent: {:?}", levels.iter().max().copied().unwrap_or(Urgency::Economy));

let mut loads = vec![2.5, 0.5, 1.0];
loads.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
println!("Loads sorted: {:?}", loads);

let ranked: Vec<Json> = bids
    .iter()
    .enumerate()
    .map(|(i, b)| {
        Json::new()
            .with("rank", i + 1)
            .with("callsign", b.callsign.clone())
            .with("distance", b.distance)
            .with("battery", b.battery)
    })
    .collect();
let level_names: Vec<String> = levels.iter().map(|u| format!("{:?}", u)).collect();
scene(
    "ranking",
    Json::new().with("bids", ranked).with("best", best_bid).with("urgencies", level_names).with("loads", loads),
);`,
      explanation:
        "Urgency derives all four comparison traits, so its variants rank in the order they are written. Bid implements Ord by hand: cmp chains distance, then the other bid's battery against ours (so more battery sorts earlier), then the callsign so the ordering agrees with the derived equality. PartialOrd just returns Some(self.cmp(other)). With Ord in place, sort(), min() and < all work. Decimals are only PartialOrd (NaN), so they need sort_by with partial_cmp.",
      hints: [
        { id: "h1", title: "The two types", content: "use std::cmp::Ordering; #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)] enum Urgency { Economy, Standard, Rush } and #[derive(Debug, Clone, PartialEq, Eq)] struct Bid { callsign: String, distance: i32, battery: u32 }" },
        { id: "h2", title: "Ord by hand", content: "impl Ord for Bid { fn cmp(&self, other: &Bid) -> Ordering { self.distance.cmp(&other.distance).then_with(|| other.battery.cmp(&self.battery)).then_with(|| self.callsign.cmp(&other.callsign)) } } impl PartialOrd for Bid { fn partial_cmp(&self, other: &Bid) -> Option<Ordering> { Some(self.cmp(other)) } }" },
        { id: "h3", title: "Using it", content: "bids.sort(); then bids.iter().min() gives Option<&Bid>; bids[0] < bids[3] compares two bids. For decimals: loads.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal)); For the scene rank is i + 1 from .enumerate()." },
      ],
      tests: [
        {
          id: "t1",
          description: "Bids sort by distance, then battery",
          assertionCode: js`
assert(lines.includes("Bids in order: Sparrow-34, Heron-32, Glider-33, Sparrow-31"), 'No line is exactly "Bids in order: Sparrow-34, Heron-32, Glider-33, Sparrow-31". Nearer bids come first; when the distance ties, the bid with MORE battery comes first (compare other.battery with self.battery).');
assert(lines.includes("Best bid: Sparrow-34"), 'No line is exactly "Best bid: Sparrow-34". bids.iter().min() returns the best bid once Ord is implemented.');
assert(lines.includes("Sparrow-34 ranks before Sparrow-31: true"), 'No line is exactly "Sparrow-34 ranks before Sparrow-31: true". After sorting, bids[0] < bids[3] uses your PartialOrd.');`,
        },
        {
          id: "t2",
          description: "Derived and decimal orderings",
          assertionCode: js`
assert(lines.includes("Urgency order: [Economy, Standard, Rush]"), 'No line is exactly "Urgency order: [Economy, Standard, Rush]". Derive PartialOrd and Ord on the enum, sort the levels and print them with {:?}.');
assert(lines.includes("Most urgent: Rush"), 'No line is exactly "Most urgent: Rush". levels.iter().max() gives the last variant.');
assert(lines.includes("Loads sorted: [0.5, 1.0, 2.5]"), 'No line is exactly "Loads sorted: [0.5, 1.0, 2.5]". f64 is not Ord, so use loads.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal)).');`,
        },
        {
          id: "t3",
          description: "The board receives the rankings",
          assertionCode: js`
const r = scene.ranking;
assert(r && typeof r === "object", 'Send scene("ranking", Json::new()...).');
assert(Array.isArray(r.bids) && r.bids.length === 4, '"bids" should hold four records in ranked order.');
assertEqual(r.bids.map((b) => b.callsign), ["Sparrow-34", "Heron-32", "Glider-33", "Sparrow-31"], "The ranked callsigns are wrong.");
assertEqual(r.bids.map((b) => b.rank), [1, 2, 3, 4], "rank should be 1, 2, 3, 4.");
assertEqual(r.best, "Sparrow-34", '"best" should be "Sparrow-34".');
assertEqual(r.urgencies, ["Economy", "Standard", "Rush"], '"urgencies" should be the sorted level names.');
assertEqual(r.loads, [0.5, 1, 2.5], '"loads" should be the sorted decimals.');`,
        },
      ],
      unlocks: ["df-ranking"],
      checks: [
        {
          prompt: "Why does `vec![2.5, 0.5].sort()` not compile?",
          question: {
            type: "choice",
            options: ["Decimals are only PartialOrd (NaN cannot be compared), but sort needs Ord", "Vectors cannot be sorted", "Decimals must be integers first", "sort needs a closure"],
            answer: 0,
          },
          explanation: "`NaN` is neither bigger nor smaller than anything, so `f64` has no total order. Use `sort_by` with `partial_cmp`.",
        },
        {
          prompt: "In `cmp`, why does the battery tie-break read `other.battery.cmp(&self.battery)` (sides swapped)?",
          question: {
            type: "choice",
            options: ["It is a typo", "Swapping reverses the order, so a bigger battery counts as smaller and sorts first", "It makes the code faster", "Because battery is unsigned"],
            answer: 1,
          },
          explanation: "`Less` means 'sorts earlier'. Comparing `other` against `self` flips the direction, so more battery means earlier.",
        },
      ],
    },
    // ───────────────────────── 11 ─────────────────────────
    {
      id: "rust-traits-11-iterator",
      title: "Write your own Iterator",
      minutes: 40,
      xp: 170,
      concepts: ["Iterator", "type Item", "next", "Option", "default methods of Iterator", "struct borrowing a slice", "E0046", "E0599"],
      learn: md`### What a for loop really asks for

\`for level in something { ... }\` works on a vector, a range, the lines of a string. What do they have in common? They all implement a trait called **\`Iterator\`**, whose whole job is: *"hand me the next item, or tell me there are no more."* Here is the trait, simplified:

~~~rust
trait Iterator {
    type Item;                                  // what each step produces
    fn next(&mut self) -> Option<Self::Item>;   // the next item, or None at the end
    // ... and dozens of default methods: map, filter, sum, zip, take, collect ...
}
~~~

Two things are worth noticing, both from earlier lessons. \`type Item\` is an **associated type**, like \`Output\` in lesson 9: each iterator says what it produces. And only \`next\` is *required*. Everything else (the whole adaptor toolbox from Corvid Peak) is a **default method** (lesson 2) written in terms of \`next\`. So if you implement \`next\`, you get \`map\`, \`filter\`, \`sum\` and the rest for free.

\`next\` takes \`&mut self\`: calling it changes the iterator (it moves forward). It returns \`Some(item)\` for each item and \`None\` when it is finished. Think of a ticket machine at a bakery: each press hands out the next number, and when the roll is empty it says so.

### A charging dock

When a drone docks, the charger tops it up by 15 percentage points per tick until it is full. Each tick the dock reports the new level. The *level so far* is the only state, so the iterator is a struct with one field:

~~~rust
struct Charging {
    level: u32,
}

impl Iterator for Charging {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.level >= 100 {
            return None;
        }
        self.level = (self.level + 15).min(100);
        Some(self.level)
    }
}
~~~

A drone docking at 40 percent is \`Charging { level: 40 }\`. Calling \`next\` by hand:

~~~rust
let mut probe = Charging { level: 40 };
println!("{:?}", probe.next());     // Some(55)
println!("{:?}", probe.next());     // Some(70)
~~~

and a loop, or \`collect\`, calls it until \`None\`:

~~~rust
let readings: Vec<u32> = Charging { level: 40 }.collect();     // [55, 70, 85, 100]
~~~

\`.min(100)\` stops the last tick from overshooting. A drone docking at 97 percent gets a single reading, \`[100]\`, then \`None\`.

### The rules the compiler checks

Forget the associated type and you get the familiar trait error:

~~~text
error[E0046]: not all trait items implemented, missing: \`Item\`
  | impl Iterator for Charging {
  | ^^^^^^^^^^^^^^^^^^^^^^^^^^ missing \`Item\` in implementation
  = help: implement the missing item: \`type Item = /* Type */;\`
~~~

And if you call an adaptor on a type that does not implement \`Iterator\`, the method looks like it does not exist:

~~~text
error[E0599]: \`Charging\` is not an iterator
  |     let firsts: Vec<u32> = c.take(2).collect();
  |                              ^^^^ \`Charging\` is not an iterator
  = note: the following trait bounds were not satisfied: \`Charging: Iterator\`
~~~

### An iterator that borrows: Hops

Iterators can walk over data that someone else owns. A route's stops live in a \`Vec\`; a \`Hops\` iterator keeps a borrowed slice of them and its position:

~~~rust
struct Hops<'a> {
    stops: &'a [Pos],
    at: usize,
}

impl<'a> Iterator for Hops<'a> {
    type Item = Pos;

    fn next(&mut self) -> Option<Pos> {
        if let Some(stop) = self.stops.get(self.at) {
            self.at += 1;
            Some(*stop)
        } else {
            None
        }
    }
}

impl Route {
    fn hops(&self) -> Hops<'_> {
        Hops { stops: &self.0, at: 0 }
    }
}
~~~

\`'a\` ties the iterator to the data it borrows (Corvid Peak, lessons 2 and 3). \`.get(i)\` returns \`Option<&Pos>\`, and \`*stop\` copies the position out because \`Pos\` is \`Copy\`. A second \`impl Route\` block is fine: a type can have as many as you like, so new code can add methods without touching old code.

### Common mistakes

- Forgetting to change the state in \`next\`: the iterator then returns the same item forever.
- Writing \`fn next(&self)\` instead of \`&mut self\` (error \`E0053\`).
- Returning \`None\` and then something again. Once an iterator says it is done, it should stay done.`,
      mission: md`Two read-outs are needed on the board. The **charging dock** reports a drone's battery level after each tick, and the **route walker** visits the stops of a route one by one. Implement both as real iterators.

Then drive them in different ways, by hand with \`next\`, with \`collect\`, with \`count\` and with \`last\`, to see how much comes for free.`,
      tasks: [
        "Above the divider write struct Charging { level: u32 } with impl Iterator for Charging (type Item = u32): return None once level >= 100, otherwise raise it by 15 (never above 100) and return Some(level)",
        "Write struct Hops<'a> { stops: &'a [Pos], at: usize } with impl<'a> Iterator for Hops<'a> (type Item = Pos) and impl Route { fn hops(&self) -> Hops<'_> }",
        "In main print First tick: Some(55) (call next() once on let mut probe = Charging { level: 40 };) and Charging from 40: 55 70 85 100 (collect a Vec<u32> from a fresh Charging, join with spaces)",
        "Print Almost full yields: [100] (collect from Charging { level: 97 } with {:?}), then Hops visited: 3 (route.hops().count()) and Last hop: Pos { x: 7, y: -2 } (route.hops().last(), falling back to depot)",
        "Send scene(\"charging\", ...) with from (40), readings (the Vec<u32>) and hops (each stop as xy(...))",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: your own Iterator. Above main:
//   struct Charging { level: u32 }     impl Iterator for Charging { type Item = u32; fn next(&mut self) -> Option<u32> { None at 100, else +15 capped at 100 } }
//   struct Hops<'a> { stops: &'a [Pos], at: usize }     impl<'a> Iterator for Hops<'a> { type Item = Pos; ... }     impl Route { fn hops(&self) -> Hops<'_> }
${MAIN_DIVIDER}
// let mut probe = Charging { level: 40 };   print  First tick: Some(55)          ({:?} of probe.next())
// let readings: Vec<u32> = Charging { level: 40 }.collect();   print  Charging from 40: 55 70 85 100       (join with spaces)
// print  Almost full yields: [100]        Hops visited: 3        Last hop: Pos { x: 7, y: -2 }       (route.hops().count(), route.hops().last().unwrap_or(depot))
// scene("charging", Json::new().with("from", 40u32).with("readings", &readings).with("hops", vec![xy(..), ..]));
`,
      solutionAdd: rs`struct Charging {
    level: u32,
}

impl Iterator for Charging {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.level >= 100 {
            return None;
        }
        self.level = (self.level + 15).min(100);
        Some(self.level)
    }
}

struct Hops<'a> {
    stops: &'a [Pos],
    at: usize,
}

impl<'a> Iterator for Hops<'a> {
    type Item = Pos;

    fn next(&mut self) -> Option<Pos> {
        if let Some(stop) = self.stops.get(self.at) {
            self.at += 1;
            Some(*stop)
        } else {
            None
        }
    }
}

impl Route {
    fn hops(&self) -> Hops<'_> {
        Hops { stops: &self.0, at: 0 }
    }
}
${MAIN_DIVIDER}
// Lesson 11: iterators we wrote ourselves.
let mut probe = Charging { level: 40 };
println!("First tick: {:?}", probe.next());

let readings: Vec<u32> = Charging { level: 40 }.collect();
let shown: Vec<String> = readings.iter().map(|r| r.to_string()).collect();
println!("Charging from 40: {}", shown.join(" "));

let almost: Vec<u32> = Charging { level: 97 }.collect();
println!("Almost full yields: {:?}", almost);

println!("Hops visited: {}", route.hops().count());
let last_hop = route.hops().last().unwrap_or(depot);
println!("Last hop: {:?}", last_hop);

scene(
    "charging",
    Json::new()
        .with("from", 40u32)
        .with("readings", &readings)
        .with("hops", route.hops().map(xy).collect::<Vec<Vec<i32>>>()),
);`,
      explanation:
        "An iterator is any type that implements Iterator: you name the item type with type Item and write next, which returns Some(item) or None. Charging keeps its level as state and moves it forward on every call; Hops keeps a borrowed slice and an index. Once next exists, the default methods (collect, count, last, and the rest of the adaptors) work for free, because they are all written in terms of next.",
      hints: [
        { id: "h1", title: "Charging", content: "struct Charging { level: u32 } impl Iterator for Charging { type Item = u32; fn next(&mut self) -> Option<u32> { if self.level >= 100 { return None; } self.level = (self.level + 15).min(100); Some(self.level) } }" },
        { id: "h2", title: "Hops", content: "struct Hops<'a> { stops: &'a [Pos], at: usize } impl<'a> Iterator for Hops<'a> { type Item = Pos; fn next(&mut self) -> Option<Pos> { if let Some(stop) = self.stops.get(self.at) { self.at += 1; Some(*stop) } else { None } } } impl Route { fn hops(&self) -> Hops<'_> { Hops { stops: &self.0, at: 0 } } }" },
        { id: "h3", title: "Driving them", content: "let mut probe = Charging { level: 40 }; println!(\"First tick: {:?}\", probe.next()); let readings: Vec<u32> = Charging { level: 40 }.collect(); route.hops().count() and route.hops().last().unwrap_or(depot) use default Iterator methods." },
      ],
      tests: [
        {
          id: "t1",
          description: "Charging is an iterator",
          assertionCode: js`
assert(lines.includes("First tick: Some(55)"), 'No line is exactly "First tick: Some(55)". Docking at 40, the first next() adds 15 and returns Some(55).');
assert(lines.includes("Charging from 40: 55 70 85 100"), 'No line is exactly "Charging from 40: 55 70 85 100". collect() calls next() until it returns None; the last reading must stop at 100.');
assert(lines.includes("Almost full yields: [100]"), 'No line is exactly "Almost full yields: [100]". Docking at 97 should give one reading, 100 (cap it with .min(100)), then None.');`,
        },
        {
          id: "t2",
          description: "Hops walks a route",
          assertionCode: js`
assert(lines.includes("Hops visited: 3"), 'No line is exactly "Hops visited: 3". route.hops().count() should count the three stops.');
assert(lines.includes("Last hop: Pos { x: 7, y: -2 }"), 'No line is exactly "Last hop: Pos { x: 7, y: -2 }". route.hops().last() is the final stop.');`,
        },
        {
          id: "t3",
          description: "The board receives the readings and the stops",
          assertionCode: js`
const c = scene.charging;
assert(c && typeof c === "object", 'Send scene("charging", Json::new()...).');
assertEqual(c.from, 40, '"from" should be 40.');
assertEqual(c.readings, [55, 70, 85, 100], '"readings" should be the collected levels.');
assertEqual(c.hops, [[0, 0], [3, 4], [7, -2]], '"hops" should list the stops as [x, y] pairs, in order.');`,
        },
      ],
      unlocks: ["df-charging"],
      checks: [
        {
          prompt: "Which method must you write to implement `Iterator`, besides naming `type Item`?",
          question: { type: "text", answer: ["next", "fn next", "next()"] },
          explanation: "`next` is the only required method. `map`, `filter`, `sum`, `collect` and the rest are default methods built on top of it.",
        },
        {
          prompt: "What does `next` return when the iterator is finished?",
          question: {
            type: "choice",
            options: ["`Some(0)`", "`None`", "An error", "It panics"],
            answer: 1,
          },
          explanation: "`Option<Self::Item>`: `Some(item)` while there is more, `None` at the end.",
        },
      ],
    },
    // ───────────────────────── 12 ─────────────────────────
    {
      id: "rust-traits-12-adaptors",
      title: "Adaptors: pipelines on your own iterator",
      minutes: 35,
      xp: 150,
      concepts: ["iterator adaptors", "zip", "enumerate", "take", "filter", "sum", "impl Iterator return", "+ '_"],
      learn: md`### The payoff of one small method

Last lesson you wrote \`next\` and nothing else. This lesson spends what you earned: every adaptor you met in Corvid Peak now works on \`Charging\` and \`Hops\` too, with no extra code. An **adaptor** is a default method that takes an iterator and gives back a new one; chained together they form a **pipeline**, and nothing runs until a final step (\`collect\`, \`sum\`, \`count\`, a \`for\` loop) pulls items through. A conveyor belt behaves the same: the stations do nothing until a box arrives at the start.

~~~rust
let first_three: Vec<u32> = Charging { level: 10 }.take(3).collect();       // [25, 40, 55]
let total: u32 = Charging { level: 10 }.take(3).sum();                       // 25 + 40 + 55 = 120
let full_only = Charging { level: 40 }.filter(|&l| l >= 85).count();         // readings 85 and 100: 2
~~~

- \`take(n)\` stops after \`n\` items. (Handy: an iterator may be long, or in other programs even endless.)
- \`filter(|&l| ...)\` keeps the items for which the closure says true (\`|&l|\` takes the item out of the reference the closure receives).
- \`sum()\` adds the items up, \`count()\` counts them. For \`sum\` the compiler wants to know the type you want, so annotate it (\`let total: u32\`), or you get "type annotations needed".

### Pairing iterators: zip and enumerate

\`zip\` walks two iterators in step and hands you pairs; it stops as soon as the shorter one ends. \`enumerate\` adds a counter starting at 0:

~~~rust
route.legs().zip(Charging { level: 40 })       // (leg length, charge after a tick), pair by pair
    .enumerate()                                // (index, (leg length, charge))
~~~

### Returning an iterator: impl Iterator

You met \`-> impl Trait\` in lesson 4. It is the natural way to hand back an iterator pipeline, because the real type of a long chain of adaptors is a monster nobody wants to write:

~~~rust
impl Route {
    fn legs(&self) -> impl Iterator<Item = i32> + '_ {
        self.hops().zip(self.hops().skip(1)).map(|(from, to)| from.distance(to))
    }
}
~~~

Reading it:

- \`impl Iterator<Item = i32>\` means "some iterator that produces \`i32\`s". The \`Item = i32\` part names the associated type (lesson 11).
- \`+ '_\` says the returned iterator borrows from \`self\`, so it cannot outlive the route (Corvid Peak's lifetimes again: \`'_\` means "the borrow of self").
- \`self.hops().zip(self.hops().skip(1))\` pairs each stop with the next one, because the second walker starts one step ahead. \`skip(1)\` throws away its first item. Each pair is one **leg**.
- \`.map(|(from, to)| from.distance(to))\` turns each pair into a length with the method from lesson 9.

A route with three stops has two legs. Three stops: (0,0), (3,4), (7,-2). The legs are 7 and 10 grid steps:

~~~text
(0,0) -> (3,4):   3 + 4 = 7
(3,4) -> (7,-2):  4 + 6 = 10
~~~

### Laziness, in one example

\`let pipeline = route.legs().map(|d| d * 3);\` does no work at all. Only when something pulls (\`.sum()\`, \`.collect()\`, a loop) does the first stop get visited. If a pipeline seems to "do nothing", check that something consumes it. The compiler even warns: "unused ... that must be used".

### Common mistakes

- Forgetting the final consuming step.
- Using \`.sum()\` without saying which number type you want.
- Returning a pipeline without \`+ '_\` when it borrows from \`self\` (the compiler asks for a lifetime).`,
      mission: md`The flight planner needs a route report: the length of each leg, the total distance, how many legs are long, and how a drone's charge grows while it flies the legs. Every number comes from a pipeline built on the iterators you wrote.

Add a \`legs\` method to the route, build the pipelines, and send each stage's item count to the board.`,
      tasks: [
        "Above the divider add a second impl Route block with fn legs(&self) -> impl Iterator<Item = i32> + '_ that zips self.hops() with self.hops().skip(1) and maps each pair to from.distance(to)",
        "In main print Leg lengths: 7 10 (collect route.legs(), join with spaces), Total flight: 17 cells (let total: i32 = route.legs().sum();) and Long legs: 1 (filter legs above 8, then count)",
        "Build the plan with route.legs().zip(Charging { level: 40 }).enumerate().map(...) giving leg 1: 7 cells, 55% charged and leg 2: 10 cells, 70% charged, and print Plan: followed by both texts joined with \" | \"",
        "Print Three ticks sum: 120 using Charging { level: 10 }.take(3) and sum with a u32 annotation",
        "Send scene(\"adaptors\", ...) with legs, total, longLegs, plan (the two texts) and stages: records with stage and count for hops (3), legs (2) and long legs (1)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: adaptors. Above main:
//   impl Route { fn legs(&self) -> impl Iterator<Item = i32> + '_ { self.hops().zip(self.hops().skip(1)).map(|(from, to)| from.distance(to)) } }
${MAIN_DIVIDER}
// let leg_lengths: Vec<i32> = route.legs().collect();       print  Leg lengths: 7 10
// let total_flight: i32 = route.legs().sum();               print  Total flight: 17 cells
// let long_legs = route.legs().filter(|&d| d > 8).count();   print  Long legs: 1
// let plan: Vec<String> = route.legs().zip(Charging { level: 40 }).enumerate().map(|(i, (len, charge))| format!("leg {}: {} cells, {}% charged", i + 1, len, charge)).collect();
// print  Plan: leg 1: 7 cells, 55% charged | leg 2: 10 cells, 70% charged
// let three: u32 = Charging { level: 10 }.take(3).sum();      print  Three ticks sum: 120
// scene("adaptors", Json::new().with("legs", ..).with("total", ..).with("longLegs", ..).with("plan", ..).with("stages", vec![ Json::new().with("stage", "hops").with("count", 3usize), .. ]));
`,
      solutionAdd: rs`impl Route {
    fn legs(&self) -> impl Iterator<Item = i32> + '_ {
        self.hops().zip(self.hops().skip(1)).map(|(from, to)| from.distance(to))
    }
}
${MAIN_DIVIDER}
// Lesson 12: pipelines on our own iterators.
let leg_lengths: Vec<i32> = route.legs().collect();
let leg_text: Vec<String> = leg_lengths.iter().map(|d| d.to_string()).collect();
println!("Leg lengths: {}", leg_text.join(" "));

let total_flight: i32 = route.legs().sum();
println!("Total flight: {} cells", total_flight);

let long_legs = route.legs().filter(|&d| d > 8).count();
println!("Long legs: {}", long_legs);

let plan: Vec<String> = route
    .legs()
    .zip(Charging { level: 40 })
    .enumerate()
    .map(|(i, (len, charge))| format!("leg {}: {} cells, {}% charged", i + 1, len, charge))
    .collect();
println!("Plan: {}", plan.join(" | "));

let three_ticks: u32 = Charging { level: 10 }.take(3).sum();
println!("Three ticks sum: {}", three_ticks);

scene(
    "adaptors",
    Json::new()
        .with("legs", &leg_lengths)
        .with("total", total_flight)
        .with("longLegs", long_legs)
        .with("plan", &plan)
        .with(
            "stages",
            vec![
                Json::new().with("stage", "hops").with("count", route.hops().count()),
                Json::new().with("stage", "legs").with("count", route.legs().count()),
                Json::new().with("stage", "long legs").with("count", long_legs),
            ],
        ),
);`,
      explanation:
        "Because Hops and Charging implement Iterator, all the default adaptors work on them. legs() zips the stops with the stops shifted by one (skip(1)), so every pair is one leg, and returns the pipeline as impl Iterator<Item = i32> + '_ (the '_ because it borrows from the route). sum, filter, count, zip, enumerate and take then give the report numbers; nothing runs until a consuming step pulls items through.",
      hints: [
        { id: "h1", title: "legs", content: "impl Route { fn legs(&self) -> impl Iterator<Item = i32> + '_ { self.hops().zip(self.hops().skip(1)).map(|(from, to)| from.distance(to)) } } A second impl Route block is fine." },
        { id: "h2", title: "The numbers", content: "let leg_lengths: Vec<i32> = route.legs().collect(); let total_flight: i32 = route.legs().sum(); let long_legs = route.legs().filter(|&d| d > 8).count(); Join numbers by mapping them to strings first." },
        { id: "h3", title: "The plan", content: "route.legs().zip(Charging { level: 40 }).enumerate().map(|(i, (len, charge))| format!(\"leg {}: {} cells, {}% charged\", i + 1, len, charge)).collect::<Vec<String>>() then plan.join(\" | \"). And let three_ticks: u32 = Charging { level: 10 }.take(3).sum();" },
      ],
      tests: [
        {
          id: "t1",
          description: "legs and sum measure the route",
          assertionCode: js`
assert(lines.includes("Leg lengths: 7 10"), 'No line is exactly "Leg lengths: 7 10". legs() pairs each stop with the next (zip with skip(1)) and maps each pair to from.distance(to).');
assert(lines.includes("Total flight: 17 cells"), 'No line is exactly "Total flight: 17 cells". let total_flight: i32 = route.legs().sum();');
assert(lines.includes("Long legs: 1"), 'No line is exactly "Long legs: 1". Count the legs longer than 8: route.legs().filter(|&d| d > 8).count().');`,
        },
        {
          id: "t2",
          description: "zip and take work on our own Charging iterator",
          assertionCode: js`
assert(lines.includes("Plan: leg 1: 7 cells, 55% charged | leg 2: 10 cells, 70% charged"), 'No line is exactly "Plan: leg 1: 7 cells, 55% charged | leg 2: 10 cells, 70% charged". Zip route.legs() with Charging { level: 40 }, enumerate, map to text, join with " | ".');
assert(lines.includes("Three ticks sum: 120"), 'No line is exactly "Three ticks sum: 120". Charging { level: 10 }.take(3) yields 25, 40, 55.');`,
        },
        {
          id: "t3",
          description: "The board gets the route report",
          assertionCode: js`
const a = scene.adaptors;
assert(a && typeof a === "object", 'Send scene("adaptors", Json::new()...).');
assertEqual(a.legs, [7, 10], '"legs" should be [7, 10].');
assertEqual(a.total, 17, '"total" should be 17.');
assertEqual(a.longLegs, 1, '"longLegs" should be 1.');
assert(Array.isArray(a.plan) && a.plan.length === 2, '"plan" should hold the two leg texts.');
assertEqual((a.stages || []).map((s) => [s.stage, s.count]), [["hops", 3], ["legs", 2], ["long legs", 1]], '"stages" should be hops 3, legs 2, long legs 1.');`,
        },
      ],
      unlocks: ["df-pipeline"],
      checks: [
        {
          prompt: "`route.legs().map(|d| d * 3);` on its own line (nothing after it) does what?",
          question: {
            type: "choice",
            options: ["Triples every leg and prints it", "Nothing: iterator pipelines are lazy until something consumes them", "Panics", "Sorts the legs"],
            answer: 1,
          },
          explanation: "Adaptors build a recipe. `collect`, `sum`, `count` or a `for` loop is what actually pulls items through.",
        },
        {
          prompt: "What does `+ '_` mean in `-> impl Iterator<Item = i32> + '_`?",
          question: {
            type: "choice",
            options: ["The iterator is infinite", "The returned iterator borrows from `self`, so it cannot outlive it", "The items are references", "The iterator is mutable"],
            answer: 1,
          },
          explanation: "`'_` stands for the borrow of `self` that the pipeline carries around. It ties the iterator's lifetime to the route.",
        },
      ],
    },
  ],
};
