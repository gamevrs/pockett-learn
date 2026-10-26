import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 4: Types that model. Structs, enums, Option and Result, and finally HashMap and iterators,
 * which turn the whole station into one report.
 *
 * Every lesson here adds items above main (before MAIN_DIVIDER) and statements below it.
 */

export const chapter4: Chapter = {
  id: "types-that-model",
  title: "Types that model",
  blurb: "Describe the station with your own types, make \"might be missing\" and \"might fail\" part of the type system, and finish with a report.",
  lessons: [
    // ───────────────────────── 12 ─────────────────────────
    {
      id: "rust-basics-12-structs",
      title: "Structs and methods",
      minutes: 40,
      xp: 140,
      concepts: ["struct", "fields", "impl", "methods", "&self", "&mut self", "associated functions", "Self", "derive", "Debug", "Clone"],
      learn: md`### Your own types

So far the station's data has been loose variables. A drone has a name, a battery level, a depth and a flag, and those belong together. A **struct** groups named fields into one new type.

~~~rust
struct Drone {
    name: String,
    battery_pct: u32,
    depth_m: i32,
    active: bool,
}

let mut manta = Drone {
    name: String::from("Manta"),
    battery_pct: 100,
    depth_m: 0,
    active: false,
};
println!("{} is at {} m", manta.name, manta.depth_m);
manta.depth_m = 30;                  // needs \`mut\` on the whole value
~~~

Type names are \`CamelCase\`, fields are \`snake_case\`. You read a field with a dot. Mutability belongs to the **whole value**: either the variable is \`mut\` and every field can change, or none can. (There is no per-field \`mut\`.) Every field must be given a value when you create the struct, or you get error[E0063]: missing field \`active\` in initializer of \`Drone\`.

Fields **own** their data, which is why the name is a \`String\` and not a \`&str\`. A struct that holds a borrowed \`&str\` needs a lifetime annotation (error[E0106]: missing lifetime specifier), which is a topic for the next project. In a beginner struct, own your data.

### Methods live in an \`impl\` block

Functions that belong to a type go in an \`impl\` (implementation) block. The first parameter decides how the method uses the value:

~~~rust
impl Drone {
    fn new(name: &str) -> Drone {              // an associated function: no self, called Drone::new(...)
        Drone { name: name.to_string(), battery_pct: 100, depth_m: 0, active: false }
    }

    fn needs_charge(&self) -> bool {           // &self: read only, borrows the drone
        self.battery_pct < 20
    }

    fn dive(&mut self, metres: i32) {          // &mut self: may change the drone
        self.depth_m += metres;
        self.active = true;
    }
}

let mut manta = Drone::new("Manta");           // :: for associated functions
manta.dive(30);                                // . for methods
println!("{}", manta.needs_charge());
~~~

- **Associated functions** (no \`self\`) are called with \`Type::name(...)\`. \`new\` is the conventional constructor. It is just a normal function with that name, not special syntax.
- **\`&self\`** borrows read-only, **\`&mut self\`** borrows exclusively (the variable must be \`mut\`), and plain **\`self\`** takes ownership and uses the value up. These are exactly the three kinds of access from the last two lessons.
- Inside an \`impl\`, \`Self\` is a nickname for the type, so \`-> Self\` and \`-> Drone\` mean the same.
- You may write several \`impl\` blocks for one type. Lesson 13 adds a second one.
- Calling a method needs no \`&\` or \`*\`: \`manta.dive(30)\` borrows \`manta\` for you.

Forgetting \`mut\` gives the usual error: error[E0596]: cannot borrow \`manta\` as mutable, as it is not declared as mutable. Forgetting \`self.\` before a field gives error[E0425]: cannot find value \`battery_pct\` in this scope.

### \`#[derive(...)]\`: free capabilities

A freshly made struct can't be printed with \`{:?}\` or copied with \`.clone()\`. You ask the compiler to write those for you with an attribute above the struct:

~~~rust
#[derive(Debug, Clone)]
struct Drone { /* ... */ }

println!("{:?}", pip);
// Drone { name: "Pip", battery_pct: 15, depth_m: 170, active: true }
println!("{:#?}", pip);       // the same, spread over several lines, easier for big values

let mut spare = manta.clone(); // an independent copy of the whole drone, name and all
~~~

\`Debug\` and \`Clone\` are **traits**: named sets of abilities. \`derive\` writes the obvious implementation field by field. This only works when every field already has the trait, which \`String\`, numbers and bools do. Other common derives are \`PartialEq\` (so you can use \`==\`) and \`Copy\` (for small all-Copy structs).

### Now you can read the helper

Scroll to the top of your file. The provided code makes a \`Json\` object like this:

~~~rust
Json::new().with("name", &self.name).with("battery", self.battery_pct)
~~~

\`Json::new()\` is an associated function. \`with\` takes \`mut self\` (it owns the object), adds one key and **returns self**, so you can chain the next call. That is the **builder pattern**, and it is just a method that takes ownership and gives it back, like \`stamp\` in lesson 9. You will use it now in a \`card\` method that describes a drone to the station.

### Common mistakes

- Missing a field when you build a struct (E0063), or a misspelt field (E0560/E0609).
- Calling a \`&mut self\` method on an immutable variable (E0596).
- Forgetting \`self.\` inside a method.
- Using \`&str\` for a field because it looks lighter. Use \`String\` unless you know about lifetimes.
- Calling an associated function like a method (\`manta.new()\`) or a method like an associated function.`,
      mission: md`The station's drones are its hands and eyes. Each one has a name, a battery, a depth and an active flag, and each knows how to dive, report its status, and say whether it needs charging. You have been holding them together with parallel variables; it is time to give them a real type.

You will define the \`Drone\` struct with a constructor, three methods and a \`card\` that describes it to the station, then launch three drones. When this lesson passes, the **Drone bay** lights up.`,
      tasks: [
        "Above the divider define #[derive(Debug, Clone)] struct Drone with fields name: String, battery_pct: u32, depth_m: i32 and active: bool",
        "Write impl Drone with: new(name: &str) -> Drone (battery 100, depth 0, not active); dive(&mut self, metres: i32), which adds to depth_m, sets active to true and lowers battery_pct by metres / 2 using saturating_sub; needs_charge(&self) -> bool (battery below 20); status(&self) -> String formatted like Manta: 85% battery at 30 m",
        "Add card(&self) -> Json that returns Json::new() with the keys name (&self.name), battery, depthM, active and needsCharge (needs_charge())",
        "In main: let mut manta = Drone::new(\"Manta\"); manta.dive(30); let mut pip = Drone::new(\"Pip\"); pip.dive(170); and let mut spare = manta.clone(); with spare.name = String::from(\"Spare\");",
        "Print manta.status(), pip.status(), {:?} of pip and spare.status()",
        "Send scene(\"fleet\", vec![manta.card(), pip.card(), spare.card()]);",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: the drone bay. Define the Drone type in this part of the file (above main):
// #[derive(Debug, Clone)]
// struct Drone { name: String, battery_pct: u32, depth_m: i32, active: bool }
// impl Drone {
//     fn new(name: &str) -> Drone                 battery 100, depth 0, not active
//     fn dive(&mut self, metres: i32)             depth += metres, active = true,
//                                                 battery_pct = battery_pct.saturating_sub((metres / 2) as u32)
//     fn needs_charge(&self) -> bool              battery_pct < 20
//     fn status(&self) -> String                  format!("{}: {}% battery at {} m", ...)
//     fn card(&self) -> Json                      Json::new().with("name", &self.name).with("battery", ...)
//                                                 keys: name, battery, depthM, active, needsCharge
// }
${MAIN_DIVIDER}
// let mut manta = Drone::new("Manta");   manta.dive(30);
// let mut pip = Drone::new("Pip");       pip.dive(170);
// let mut spare = manta.clone();         spare.name = String::from("Spare");
// Print:  manta.status()   pip.status()   {:?} of pip   spare.status()
// scene("fleet", vec![manta.card(), pip.card(), spare.card()]);
`,
      solutionAdd: rs`#[derive(Debug, Clone)]
struct Drone {
    name: String,
    battery_pct: u32,
    depth_m: i32,
    active: bool,
}

impl Drone {
    fn new(name: &str) -> Drone {
        Drone {
            name: name.to_string(),
            battery_pct: 100,
            depth_m: 0,
            active: false,
        }
    }

    fn dive(&mut self, metres: i32) {
        self.depth_m += metres;
        self.active = true;
        let cost = (metres / 2) as u32;
        self.battery_pct = self.battery_pct.saturating_sub(cost);
    }

    fn needs_charge(&self) -> bool {
        self.battery_pct < 20
    }

    fn status(&self) -> String {
        format!("{}: {}% battery at {} m", self.name, self.battery_pct, self.depth_m)
    }

    fn card(&self) -> Json {
        Json::new()
            .with("name", &self.name)
            .with("battery", self.battery_pct)
            .with("depthM", self.depth_m)
            .with("active", self.active)
            .with("needsCharge", self.needs_charge())
    }
}
${MAIN_DIVIDER}
// Lesson 12: the drone bay.
let mut manta = Drone::new("Manta");
manta.dive(30);
let mut pip = Drone::new("Pip");
pip.dive(170);
let mut spare = manta.clone();
spare.name = String::from("Spare");

println!("{}", manta.status());
println!("{}", pip.status());
println!("{:?}", pip);
println!("{}", spare.status());

scene("fleet", vec![manta.card(), pip.card(), spare.card()]);`,
      explanation:
        "The struct bundles four fields, and derive(Debug, Clone) gives it {:?} printing and .clone(). new is an associated function (no self) that builds a drone with starting values. dive takes &mut self, so it can change the drone, and the variable must be declared mut. The battery cost is metres / 2 converted to u32, and saturating_sub stops at 0 instead of underflowing. status and needs_charge only read, so they take &self. Cloning manta gives an independent drone, and changing the clone's name leaves manta alone. card uses the provided builder: each .with(...) takes the Json, adds one key and returns it.",
      hints: [
        { id: "h1", title: "The struct and new", content: "#[derive(Debug, Clone)] struct Drone { name: String, battery_pct: u32, depth_m: i32, active: bool } and inside impl Drone: fn new(name: &str) -> Drone { Drone { name: name.to_string(), battery_pct: 100, depth_m: 0, active: false } } Both go above the divider." },
        { id: "h2", title: "Methods", content: "fn dive(&mut self, metres: i32) { self.depth_m += metres; self.active = true; let cost = (metres / 2) as u32; self.battery_pct = self.battery_pct.saturating_sub(cost); } fn needs_charge(&self) -> bool { self.battery_pct < 20 } The fields are reached with self." },
        { id: "h3", title: "status and card", content: "fn status(&self) -> String { format!(\"{}: {}% battery at {} m\", self.name, self.battery_pct, self.depth_m) } fn card(&self) -> Json { Json::new().with(\"name\", &self.name).with(\"battery\", self.battery_pct).with(\"depthM\", self.depth_m).with(\"active\", self.active).with(\"needsCharge\", self.needs_charge()) }" },
      ],
      tests: [
        {
          id: "t1",
          description: "Each drone reports its status",
          assertionCode: js`
assert(lines.includes("Manta: 85% battery at 30 m"), 'Print manta.status(). After dive(30) the battery is 100 - 30 / 2 = 85, so the line is "Manta: 85% battery at 30 m".');
assert(lines.includes("Pip: 15% battery at 170 m"), 'Print pip.status(). After dive(170) the battery is 100 - 85 = 15, so the line is "Pip: 15% battery at 170 m".');`,
        },
        {
          id: "t2",
          description: "Debug is derived: {:?} prints the whole struct",
          assertionCode: js`assert(lines.includes('Drone { name: "Pip", battery_pct: 15, depth_m: 170, active: true }'), 'Print pip with {:?}. It needs #[derive(Debug)] above the struct, and the fields in the order name, battery_pct, depth_m, active.');`,
        },
        {
          id: "t3",
          description: "clone makes an independent copy",
          assertionCode: js`assert(lines.includes("Spare: 85% battery at 30 m"), 'Print spare.status(). spare = manta.clone() has manta\'s battery and depth, but its name was changed to "Spare".');`,
        },
        {
          id: "t4",
          description: "The fleet cards reach the station",
          assertionCode: js`
assert(Array.isArray(scene.fleet) && scene.fleet.length === 3, 'Send three cards: scene("fleet", vec![manta.card(), pip.card(), spare.card()]);');
const names = scene.fleet.map((d) => d.name);
assertEqual(names, ["Manta", "Pip", "Spare"], "fleet names");
assertEqual(scene.fleet.map((d) => d.battery), [85, 15, 85], "fleet battery");
assertEqual(scene.fleet.map((d) => d.depthM), [30, 170, 30], "fleet depthM");
assertEqual(scene.fleet.map((d) => d.needsCharge), [false, true, false], "fleet needsCharge (battery below 20)");`,
        },
      ],
      unlocks: ["rs-drones"],
      checks: [
        {
          prompt: "Which receiver lets a method change the struct it is called on?",
          question: { type: "choice", options: ["`self`", "`&self`", "`&mut self`", "`Self`"], answer: 2 },
          explanation: "`&mut self` borrows the value exclusively, so the method may change fields. `&self` is read-only and plain `self` takes ownership. The variable you call it on must be `mut`.",
        },
        {
          prompt: "What is the difference between `Drone::new(\"Pip\")` and `pip.dive(10)`?",
          question: {
            type: "choice",
            options: [
              "`new` is an associated function (no self) called with `::`; `dive` is a method called on a value with `.`",
              "There is none, they are the same thing",
              "`new` is a keyword of the language",
              "`dive` can only be called once",
            ],
            answer: 0,
          },
          explanation: "A function in an `impl` block whose first parameter is not `self` belongs to the type itself, so you call it as `Type::name`. `new` is only a convention for constructors, not special syntax.",
        },
        {
          prompt: "You want `println!(\"{:?}\", drone)` to work for your struct. What do you add?",
          question: { type: "choice", options: ["`#[derive(Debug)]` above the struct", "`impl Print for Drone`", "`use std::debug;`", "Nothing, every struct prints"], answer: 0 },
          explanation: "`{:?}` needs the `Debug` trait. `#[derive(Debug)]` asks the compiler to write the implementation for every field, as long as the fields can all be printed too.",
        },
      ],
    },

    // ───────────────────────── 13 ─────────────────────────
    {
      id: "rust-basics-13-enums",
      title: "Enums and exhaustive match",
      minutes: 40,
      xp: 140,
      concepts: ["enum", "variants with data", "match on enums", "exhaustiveness", "impl for enums", "PartialEq", "match ergonomics"],
      learn: md`### "One of these things"

A struct says *all of these together*: a drone has a name **and** a battery **and** a depth. An **enum** says *one of these alternatives*: a command is a dive **or** a surface **or** a charge **or** a scan. Rust's enums are far more powerful than the numbered constants of other languages, because each variant can carry its own data.

~~~rust
enum Command {
    Dive(i32),                  // carries the number of metres
    Surface,                    // carries nothing
    Charge { minutes: u32 },    // carries a named field
    Scan(String),               // carries an owned String
}

let first = Command::Dive(40);
let second = Command::Charge { minutes: 30 };
let third = Command::Surface;
~~~

Variants are namespaced under the enum (\`Command::Dive\`). Writing just \`Dive(40)\` is error[E0425]: cannot find function, tuple struct or tuple variant \`Dive\` in this scope.

An enum value is always **exactly one variant** at a time, and the compiler can see which. That is how you make **illegal states impossible**: a command cannot be both \`Surface\` and \`Dive(40)\` at once, and a \`Dive\` always has its metres, with no way to "forget" them.

### Taking an enum apart with \`match\`

~~~rust
fn describe(command: &Command) -> String {
    match command {
        Command::Dive(metres) => format!("dive {metres} m"),
        Command::Surface => String::from("surface"),
        Command::Charge { minutes } => format!("charge for {minutes} min"),
        Command::Scan(site) => format!("scan {site}"),
    }
}
~~~

Each arm's pattern names the variant and **binds** the data inside it to variables you can use in that arm. And the match must be **exhaustive**. This is where enums pay off: add a fifth variant tomorrow and every \`match\` that does not handle it stops compiling.

~~~text
error[E0004]: non-exhaustive patterns: \`&Command::Recall\` not covered
  |
  |     match command {
  |           ^^^^^^^ pattern \`&Command::Recall\` not covered
  |
help: ensure that all possible cases are being handled by adding a match arm with a wildcard pattern or an explicit pattern as shown
~~~

In a language without this, the new case silently falls through some \`default:\` branch in code you forgot existed. Here the compiler gives you a to-do list of every place to update. Resist the urge to add a lazy \`_ =>\` arm to silence it. A wildcard turns that safety net off for future variants.

### References and bindings

Because \`describe\` receives a **reference** (\`&Command\`), the bindings are references to the data too: \`metres\` is a \`&i32\`. Printing needs no star, but to use the number itself you write \`*metres\`. (Rust calls the convenience that lets you write the pattern without \`&\` "match ergonomics".)

### Methods on enums

Enums get \`impl\` blocks exactly like structs. A second \`impl Drone\` block that interprets a \`Command\` is a very natural shape:

~~~rust
impl Drone {
    fn run(&mut self, command: &Command) -> String {
        match command {
            Command::Dive(metres) => {
                self.dive(*metres);
                format!("{} dives {} m", self.name, metres)
            }
            Command::Surface => {
                self.depth_m = 0;
                format!("{} surfaces", self.name)
            }
            /* ... */
        }
    }
}
~~~

Every arm produces a \`String\`, because \`match\` is an expression. An arm with several statements uses a block and ends with the value.

### Comparing enums and the simple kind

An enum with no data in any variant is like the constants of other languages:

~~~rust
#[derive(Debug, PartialEq)]
enum Health { Good, Low, Critical }

if drone.health() == Health::Critical { /* ... */ }
~~~

\`==\` on your own types requires \`#[derive(PartialEq)]\`. Without it: error[E0369]: binary operation \`==\` cannot be applied to type \`Health\`. And \`{:?}\` on a unit variant prints its name: \`Critical\`.

When you only care about one variant, \`if let Command::Dive(m) = command { ... }\` is shorter than a full \`match\`. Use a full \`match\` when you want the compiler to check every case.

### Common mistakes

- Forgetting the \`Enum::\` prefix before a variant.
- A missing arm (E0004), or silencing it with \`_\` so that new variants slip by.
- The wrong shape of pattern: \`Command::Dive\` without parentheses when the variant carries data, or two names in a one-field variant (E0023).
- Comparing with \`==\` without \`PartialEq\`.
- Forgetting that the bindings of a \`&Command\` are references.`,
      mission: md`Operators on the surface radio missions to the drones, and each mission is a command: dive to a depth, scan a site, recharge for some minutes, or come back to the surface. A command is exactly one of those, and a dive always has a depth, a scan always has a site.

You will model commands as an enum, teach a drone to run them, and classify a drone's health. When this lesson passes, the **Mission orders** board lights up with the command queue.`,
      tasks: [
        "Above the divider define #[derive(Debug)] enum Command { Dive(i32), Surface, Charge { minutes: u32 }, Scan(String) }",
        "Define #[derive(Debug, PartialEq)] enum Health { Good, Low, Critical } and a second impl Drone with health(&self) -> Health (below 20 is Critical, below 50 is Low, otherwise Good)",
        "In that impl add run(&mut self, command: &Command) -> String that matches every variant: Dive calls self.dive and returns \"<name> dives <m> m\", Surface sets depth_m to 0 (\"<name> surfaces\"), Charge raises battery_pct by the minutes up to 100 (\"<name> charges for <minutes> min\"), Scan returns \"<name> scans <site>\"",
        "In main: let plan = vec![Command::Dive(40), Command::Scan(String::from(\"deep-ledge\")), Command::Charge { minutes: 30 }, Command::Surface]; loop over &plan, run each on manta, print the report, and keep format!(\"{:?}\", command) in sent and the report in reports",
        "Print Pip health: Critical from pip.health() with {:?}, and when it equals Health::Critical also print Pip must return to charge",
        "Send commands (&sent), reports (&reports), pipHealth (the Debug text, as a String) and mantaBattery",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: mission orders. Define these in this part of the file (above main):
// #[derive(Debug)]  enum Command { Dive(i32), Surface, Charge { minutes: u32 }, Scan(String) }
// #[derive(Debug, PartialEq)]  enum Health { Good, Low, Critical }
// impl Drone {
//     fn health(&self) -> Health                     < 20 Critical, < 50 Low, otherwise Good
//     fn run(&mut self, command: &Command) -> String match on every variant; Dive calls self.dive(*metres)
// }
${MAIN_DIVIDER}
// let plan = vec![Command::Dive(40), Command::Scan(String::from("deep-ledge")), Command::Charge { minutes: 30 }, Command::Surface];
// let mut sent: Vec<String> = Vec::new();   let mut reports: Vec<String> = Vec::new();
// for command in &plan { sent.push(format!("{:?}", command)); let report = manta.run(command); println!("{report}"); reports.push(report); }
// let pip_health = pip.health();   println!("Pip health: {:?}", pip_health);
// if pip_health == Health::Critical { println!("Pip must return to charge"); }
// scene keys: commands, reports, pipHealth, mantaBattery
`,
      solutionAdd: rs`#[derive(Debug)]
enum Command {
    Dive(i32),
    Surface,
    Charge { minutes: u32 },
    Scan(String),
}

#[derive(Debug, PartialEq)]
enum Health {
    Good,
    Low,
    Critical,
}

impl Drone {
    fn health(&self) -> Health {
        if self.battery_pct < 20 {
            Health::Critical
        } else if self.battery_pct < 50 {
            Health::Low
        } else {
            Health::Good
        }
    }

    fn run(&mut self, command: &Command) -> String {
        match command {
            Command::Dive(metres) => {
                self.dive(*metres);
                format!("{} dives {} m", self.name, metres)
            }
            Command::Surface => {
                self.depth_m = 0;
                format!("{} surfaces", self.name)
            }
            Command::Charge { minutes } => {
                self.battery_pct = (self.battery_pct + *minutes).min(100);
                format!("{} charges for {} min", self.name, minutes)
            }
            Command::Scan(site) => format!("{} scans {}", self.name, site),
        }
    }
}
${MAIN_DIVIDER}
// Lesson 13: mission orders.
let plan = vec![
    Command::Dive(40),
    Command::Scan(String::from("deep-ledge")),
    Command::Charge { minutes: 30 },
    Command::Surface,
];

let mut sent: Vec<String> = Vec::new();
let mut reports: Vec<String> = Vec::new();
for command in &plan {
    sent.push(format!("{:?}", command));
    let report = manta.run(command);
    println!("{report}");
    reports.push(report);
}

let pip_health = pip.health();
println!("Pip health: {:?}", pip_health);
if pip_health == Health::Critical {
    println!("Pip must return to charge");
}
let pip_health_text = format!("{:?}", pip_health);

scene("commands", &sent);
scene("reports", &reports);
scene("pipHealth", &pip_health_text);
scene("mantaBattery", manta.battery_pct);`,
      explanation:
        "Each Command variant carries exactly the data it needs: a depth, nothing, a number of minutes, or a site name. run takes the command by reference and matches every variant, so the compiler guarantees none is forgotten; each arm returns a String because match is an expression. The bindings (metres, minutes, site) are references into the command, so the dive dereferences with *metres. Manta starts at 85% after the first dive, loses 20 more on Dive(40) and gains 30 from Charge, so it ends at 95%. Pip is at 15%, which is Critical, and derive(PartialEq) is what makes the == comparison with Health::Critical legal.",
      hints: [
        { id: "h1", title: "The enums", content: "#[derive(Debug)] enum Command { Dive(i32), Surface, Charge { minutes: u32 }, Scan(String) } and #[derive(Debug, PartialEq)] enum Health { Good, Low, Critical } Variants are used as Command::Dive(40) and Health::Critical." },
        { id: "h2", title: "health and run", content: "fn health(&self) -> Health { if self.battery_pct < 20 { Health::Critical } else if self.battery_pct < 50 { Health::Low } else { Health::Good } } For run, match command { Command::Dive(metres) => { self.dive(*metres); format!(\"{} dives {} m\", self.name, metres) } ... } Every arm must produce a String." },
        { id: "h3", title: "Running the plan", content: "for command in &plan { sent.push(format!(\"{:?}\", command)); let report = manta.run(command); println!(\"{report}\"); reports.push(report); } The report is printed before it is moved into the Vec. For the board: scene(\"commands\", &sent);" },
      ],
      tests: [
        {
          id: "t1",
          description: "The drone runs each command and reports it",
          assertionCode: js`
for (const line of ["Manta dives 40 m", "Manta scans deep-ledge", "Manta charges for 30 min", "Manta surfaces"]) {
  assert(lines.includes(line), 'Print the report "' + line + '" (the String returned by manta.run(command)).');
}`,
        },
        {
          id: "t2",
          description: "The queue is recorded with the derived Debug text",
          assertionCode: js`assertEqual(scene.commands, ["Dive(40)", 'Scan("deep-ledge")', "Charge { minutes: 30 }", "Surface"], 'commands (push format!("{:?}", command) for each one, then scene("commands", &sent);)');`,
        },
        {
          id: "t3",
          description: "The reports match what was printed",
          assertionCode: js`assertEqual(scene.reports, ["Manta dives 40 m", "Manta scans deep-ledge", "Manta charges for 30 min", "Manta surfaces"], "reports");`,
        },
        {
          id: "t4",
          description: "Charge raises the battery and caps it; Pip is Critical",
          assertionCode: js`
assertEqual(scene.mantaBattery, 95, "mantaBattery (85, minus 20 for Dive(40), plus 30 for Charge)");
assertEqual(scene.pipHealth, "Critical", 'pipHealth (battery 15 is below 20; send the Debug text as a String)');
assert(lines.includes("Pip health: Critical"), 'Print the line "Pip health: Critical" with {:?}.');
assert(lines.includes("Pip must return to charge"), 'When pip.health() == Health::Critical print "Pip must return to charge".');`,
        },
      ],
      unlocks: ["rs-orders"],
      checks: [
        {
          prompt: "What does the compiler do if you add a new variant to `enum Command` and forget one `match command { ... }` that has no wildcard arm?",
          question: {
            type: "choice",
            options: [
              "Nothing, the new variant is ignored",
              "It refuses to compile: error[E0004] non-exhaustive patterns",
              "It panics at run time when the new variant appears",
              "It picks the first arm",
            ],
            answer: 1,
          },
          explanation: "Exhaustiveness is checked at compile time. The error names the missing variant, so adding a variant gives you a list of places to update. A `_ =>` wildcard would hide that list, so use it sparingly.",
        },
        {
          prompt: "Given `let c = Command::Dive(40);`, how many values can a `Command` hold at one time?",
          question: { type: "choice", options: ["Exactly one variant, with its own data", "All variants at once", "Zero or more variants", "Only the first variant"], answer: 0 },
          explanation: "An enum value is always exactly one of its variants, and only that variant's data exists. That is what makes the type a precise model of 'one of these'.",
        },
        {
          prompt: "Why does `if pip.health() == Health::Critical` need `#[derive(PartialEq)]` on `Health`?",
          question: {
            type: "choice",
            options: [
              "`==` only works on types that implement the PartialEq trait, and your own types do not by default",
              "Enums can never be compared",
              "PartialEq makes the enum Copy",
              "It is only needed for enums with data",
            ],
            answer: 0,
          },
          explanation: "Operators are traits. `==` is `PartialEq::eq`, and the derive writes it for you by comparing variants (and their data). Without it you get E0369: binary operation `==` cannot be applied to type `Health`.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "rust-basics-14-option",
      title: "Option: no null",
      minutes: 40,
      xp: 140,
      concepts: ["Option<T>", "Some", "None", "if let", "unwrap_or", "unwrap and expect", "Option<&T>", "? on Option"],
      learn: md`### The billion-dollar mistake, avoided

Many languages have a value that means "nothing here": \`null\`, \`None\`, \`nil\`, \`undefined\`. Any variable might secretly hold it, and using it crashes the program. Its inventor later called it his billion-dollar mistake.

Rust has no null. Instead, "a value that might be missing" is an ordinary enum from the standard library, available everywhere without an import:

~~~rust
enum Option<T> {
    Some(T),     // there is a value
    None,        // there is not
}
~~~

\`Option<u32>\` is a **different type** from \`u32\`. The compiler will not let you use it as a number until you have decided what to do about the \`None\` case, so you cannot forget:

~~~rust
let weight: Option<u32> = Some(420);
let heavier = weight + 1;       // error[E0369]: cannot add \`{integer}\` to \`Option<u32>\`
~~~

~~~rust
let weight: Option<u32> = 420;  // error[E0308]: mismatched types: expected \`Option<u32>\`, found integer
                                // help: try wrapping the expression in \`Some\`
~~~

Where an optional value means "not known yet", you store \`None\`. In the station's catalogue, a sample's weight is \`Option<u32>\`: unweighed samples have \`None\`.

### Ways to look inside

**\`match\`** is the universal tool and gives you exhaustiveness checking:

~~~rust
match sample.weight_g {
    Some(grams) => println!("{grams} g"),
    None => println!("not weighed yet"),
}
~~~

**\`if let\`** is the short form for when you only care about one case:

~~~rust
if let Some(sample) = find_sample(&catalogue, 999) {
    println!("found {}", sample.name);
} else {
    println!("no such sample");
}
~~~

**\`unwrap_or(default)\`** gives you the value, or a fallback if it is \`None\`:

~~~rust
let shown = weight.unwrap_or(0);        // 420, or 0 when None
~~~

**\`unwrap()\`** and **\`expect("message")\`** give you the value and **panic** if it is \`None\`: *called \`Option::unwrap()\` on a \`None\` value*. They are fine in quick experiments and for cases that truly cannot fail, but when a user's data is involved, prefer \`match\`, \`if let\` or \`unwrap_or\`. Others you will see: \`is_some()\`, \`is_none()\`, and \`.map(|w| w * 2)\` to transform the inside only when it exists (closures like \`|w| w * 2\` arrive in the last lesson).

### Where Options come from

You have already met some: \`Vec::get\`, \`first()\`, \`last()\`, \`pop()\`, \`u8::checked_add\` and \`str::find\` all return an \`Option\`, because the honest answer is sometimes "nothing". Your own functions should do the same instead of returning a magic number such as \`-1\` or an empty string:

~~~rust
fn find_sample(catalogue: &[Sample], id: u32) -> Option<&Sample> {
    for sample in catalogue {
        if sample.id == id {
            return Some(sample);
        }
    }
    None
}
~~~

Look at the return type: \`Option<&Sample>\` is "maybe a *borrowed* sample". The reference points into the catalogue, so the compiler makes sure the catalogue is not changed or dropped while you hold it. Nothing was copied. (The parameter is \`&[Sample]\`, a slice, which accepts \`&catalogue\` when you have a Vec, as in the last lessons.)

### The \`?\` operator, a first look

Inside a function that itself returns an \`Option\`, putting \`?\` after an \`Option\` means "if this is \`None\`, return \`None\` from my function right now; otherwise give me the inside":

~~~rust
fn weight_of(catalogue: &[Sample], id: u32) -> Option<u32> {
    let sample = find_sample(catalogue, id)?;     // a missing sample returns None early
    sample.weight_g                               // the sample's own Option<u32>
}
~~~

Without \`?\` that is a six-line \`match\`. Lesson 15 uses the same operator for errors.

### \`Option\` and ownership

\`Option<T>\` is \`Copy\` when \`T\` is, so an \`Option<u32>\` field can be read out of a borrowed struct freely (\`self.weight_g\`). An \`Option<String>\` is not Copy and moves like any String; to look without taking it use \`.as_ref()\` or match on a reference.

### Common mistakes

- Using \`unwrap()\` on data you do not control.
- Treating \`None\` and "zero" as the same thing. "Not weighed" is not "weighs 0 g".
- Forgetting \`Some(...)\` when you pass a value to something that wants an \`Option\`.
- Using \`?\` in a function that does not return \`Option\` or \`Result\`: error[E0277]: the \`?\` operator can only be used in a function that returns \`Result\` or \`Option\`.`,
      mission: md`The station keeps a catalogue of samples collected on the reef. A catalogue is only useful if you can look things up, and a lookup honestly might find nothing. Some samples have also not been weighed yet, so the weight itself is optional.

You will define the \`Sample\` type, write lookups that return \`Option\`, and total the weights without ever pretending that a missing weight is zero. When this lesson passes, the **Sample catalogue** lights up.`,
      tasks: [
        "Above the divider define #[derive(Debug, Clone)] struct Sample { id: u32, name: String, depth_m: i32, weight_g: Option<u32> } with impl Sample: new(id: u32, name: &str, depth_m: i32, weight_g: Option<u32>) -> Sample and card(&self) -> Json with the keys id, name, depthM and weightG",
        "Write fn find_sample(catalogue: &[Sample], id: u32) -> Option<&Sample> (loop, return Some(sample) on a match, None at the end) and fn weight_of(catalogue: &[Sample], id: u32) -> Option<u32> using the ? operator",
        "In main build let catalogue = vec![...] with Sample::new(101, \"brain coral\", 18, Some(420)), Sample::new(102, \"sea fan\", 25, None) and Sample::new(103, \"sponge\", 31, Some(150))",
        "Use match on find_sample(&catalogue, 103) to print Sample 103: sponge from 31 m, and if let / else for id 999 to print Sample 999 is not catalogued",
        "Print Weights: Some(420) None None for ids 101, 102 and 999 (with {:?}) and Manifest weight for 102: 0 g using unwrap_or(0)",
        "Loop over &catalogue adding up the known weights into total_weight_g and counting the None ones in unweighed. Print Catalogue weighs 570 g, 1 sample not weighed yet. Send catalogue (a Vec of cards), weight101, weight102, totalWeightG and unweighed",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: the sample catalogue. Define these in this part of the file (above main):
// #[derive(Debug, Clone)]  struct Sample { id: u32, name: String, depth_m: i32, weight_g: Option<u32> }
// impl Sample { fn new(id: u32, name: &str, depth_m: i32, weight_g: Option<u32>) -> Sample
//               fn card(&self) -> Json    keys: id, name, depthM, weightG }
// fn find_sample(catalogue: &[Sample], id: u32) -> Option<&Sample>
// fn weight_of(catalogue: &[Sample], id: u32) -> Option<u32>      use  find_sample(catalogue, id)?  inside
${MAIN_DIVIDER}
// let catalogue = vec![Sample::new(101, "brain coral", 18, Some(420)), Sample::new(102, "sea fan", 25, None), Sample::new(103, "sponge", 31, Some(150))];
// match find_sample(&catalogue, 103) { Some(sample) => ..., None => ... }
// if let Some(sample) = find_sample(&catalogue, 999) { ... } else { println!("Sample 999 is not catalogued"); }
// let weight_101 = weight_of(&catalogue, 101); let weight_102 = ...; let weight_999 = ...;
// println!("Weights: {:?} {:?} {:?}", weight_101, weight_102, weight_999);
// println!("Manifest weight for 102: {} g", weight_102.unwrap_or(0));
// loop over &catalogue: match sample.weight_g { Some(grams) => total_weight_g += grams, None => unweighed += 1 }
// scene keys: catalogue (a Vec of sample.card()), weight101, weight102, totalWeightG, unweighed
`,
      solutionAdd: rs`#[derive(Debug, Clone)]
struct Sample {
    id: u32,
    name: String,
    depth_m: i32,
    weight_g: Option<u32>,
}

impl Sample {
    fn new(id: u32, name: &str, depth_m: i32, weight_g: Option<u32>) -> Sample {
        Sample {
            id,
            name: name.to_string(),
            depth_m,
            weight_g,
        }
    }

    fn card(&self) -> Json {
        Json::new()
            .with("id", self.id)
            .with("name", &self.name)
            .with("depthM", self.depth_m)
            .with("weightG", self.weight_g)
    }
}

fn find_sample(catalogue: &[Sample], id: u32) -> Option<&Sample> {
    for sample in catalogue {
        if sample.id == id {
            return Some(sample);
        }
    }
    None
}

fn weight_of(catalogue: &[Sample], id: u32) -> Option<u32> {
    let sample = find_sample(catalogue, id)?;
    sample.weight_g
}
${MAIN_DIVIDER}
// Lesson 14: the sample catalogue.
let catalogue = vec![
    Sample::new(101, "brain coral", 18, Some(420)),
    Sample::new(102, "sea fan", 25, None),
    Sample::new(103, "sponge", 31, Some(150)),
];

match find_sample(&catalogue, 103) {
    Some(sample) => println!("Sample 103: {} from {} m", sample.name, sample.depth_m),
    None => println!("Sample 103 is not catalogued"),
}
if let Some(sample) = find_sample(&catalogue, 999) {
    println!("Sample 999: {}", sample.name);
} else {
    println!("Sample 999 is not catalogued");
}

let weight_101 = weight_of(&catalogue, 101);
let weight_102 = weight_of(&catalogue, 102);
let weight_999 = weight_of(&catalogue, 999);
println!("Weights: {:?} {:?} {:?}", weight_101, weight_102, weight_999);
println!("Manifest weight for 102: {} g", weight_102.unwrap_or(0));

let mut total_weight_g = 0;
let mut unweighed = 0;
for sample in &catalogue {
    match sample.weight_g {
        Some(grams) => total_weight_g += grams,
        None => unweighed += 1,
    }
}
println!("Catalogue weighs {total_weight_g} g, {unweighed} sample not weighed yet");

let mut cards = Vec::new();
for sample in &catalogue {
    cards.push(sample.card());
}
scene("catalogue", cards);
scene("weight101", weight_101);
scene("weight102", weight_102);
scene("totalWeightG", total_weight_g);
scene("unweighed", unweighed);`,
      explanation:
        "weight_g is an Option<u32> because \"not weighed yet\" is a real state that is different from zero. find_sample returns Option<&Sample>: Some with a borrowed sample, or None when no id matches, and the caller has to handle both with match or if let. weight_of uses ? on that Option, which returns None early when the sample is missing, and otherwise returns the sample's own optional weight. That is why 102 (known but unweighed) and 999 (unknown) both print None. unwrap_or(0) supplies a default only where the manifest needs a number. The loop adds the Some weights (420 + 150) and counts the one None.",
      hints: [
        { id: "h1", title: "The type", content: "#[derive(Debug, Clone)] struct Sample { id: u32, name: String, depth_m: i32, weight_g: Option<u32> } with new(...) building it (name.to_string() for the String) and card(&self) -> Json using Json::new().with(\"id\", self.id).with(\"name\", &self.name)... An Option<u32> can be sent to with() directly: None becomes null." },
        { id: "h2", title: "The lookups", content: "fn find_sample(catalogue: &[Sample], id: u32) -> Option<&Sample> { for sample in catalogue { if sample.id == id { return Some(sample); } } None } and fn weight_of(catalogue: &[Sample], id: u32) -> Option<u32> { let sample = find_sample(catalogue, id)?; sample.weight_g }" },
        { id: "h3", title: "Handling the answers", content: "match find_sample(&catalogue, 103) { Some(sample) => println!(...), None => println!(...) } and if let Some(sample) = find_sample(&catalogue, 999) { ... } else { ... } For the total: match sample.weight_g { Some(grams) => total_weight_g += grams, None => unweighed += 1 }" },
      ],
      tests: [
        {
          id: "t1",
          description: "find_sample returns Some for a known id",
          assertionCode: js`assert(lines.includes("Sample 103: sponge from 31 m"), 'Print the line "Sample 103: sponge from 31 m" from the Some arm of a match on find_sample(&catalogue, 103).');`,
        },
        {
          id: "t2",
          description: "find_sample returns None for an unknown id, handled with if let",
          assertionCode: js`assert(lines.includes("Sample 999 is not catalogued"), 'Print "Sample 999 is not catalogued" when find_sample(&catalogue, 999) is None.');`,
        },
        {
          id: "t3",
          description: "weight_of uses ? and returns the Options",
          assertionCode: js`
assert(lines.includes("Weights: Some(420) None None"), 'Print the line "Weights: Some(420) None None" with {:?} for the weights of 101, 102 and 999.');
assert(lines.includes("Manifest weight for 102: 0 g"), 'Print the line "Manifest weight for 102: 0 g" using weight_102.unwrap_or(0).');
assertEqual(scene.weight101, 420, "weight101 (an Option<u32> sent with scene: Some(420) becomes 420)");
assert(scene.weight102 === null, "weight102 should reach the station as null, because None is sent as null.");`,
        },
        {
          id: "t4",
          description: "Known weights are totalled and missing ones counted",
          assertionCode: js`
assertEqual(scene.totalWeightG, 570, "totalWeightG (420 + 150)");
assertEqual(scene.unweighed, 1, "unweighed (only sample 102 has None)");
assert(lines.includes("Catalogue weighs 570 g, 1 sample not weighed yet"), 'Print the line "Catalogue weighs 570 g, 1 sample not weighed yet".');`,
        },
        {
          id: "t5",
          description: "The catalogue cards reach the station",
          assertionCode: js`
assert(Array.isArray(scene.catalogue) && scene.catalogue.length === 3, 'Send a Vec of three cards: scene("catalogue", cards);');
assertEqual(scene.catalogue.map((s) => s.name), ["brain coral", "sea fan", "sponge"], "catalogue names");
assertEqual(scene.catalogue.map((s) => s.depthM), [18, 25, 31], "catalogue depthM");
assert(scene.catalogue[1].weightG === null, "the sea fan has no weight, so its weightG must be null");`,
        },
      ],
      unlocks: ["rs-catalogue"],
      checks: [
        {
          prompt: "What does `let w: Option<u32> = None; w.unwrap_or(7)` give?",
          question: { type: "number", answer: 7 },
          explanation: "`unwrap_or` returns the value inside a `Some`, or the default you pass when it is `None`. With `None` the answer is the default, `7`.",
        },
        {
          prompt: "Why does Rust have `Option<T>` instead of `null`?",
          question: {
            type: "choice",
            options: [
              "Because 'might be missing' becomes part of the type, so the compiler forces you to handle it before you can use the value",
              "Because null is slower",
              "Because Option can hold more than one value",
              "Because Rust cannot store zero",
            ],
            answer: 0,
          },
          explanation: "A plain `u32` can never be missing. An `Option<u32>` might be, and you cannot add to it or print it as a number until you have matched on it, so the 'forgot to check for null' crash disappears.",
        },
        {
          prompt: "What does `?` do on a `None` inside a function that returns `Option<u32>`?",
          question: {
            type: "choice",
            options: ["Panics", "Returns `None` from the function immediately", "Replaces it with 0", "Does nothing"],
            answer: 1,
          },
          explanation: "`?` unwraps a `Some` and continues, but on `None` it returns `None` from the enclosing function at once. It only compiles in functions whose own return type is `Option` (or `Result`).",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "rust-basics-15-result",
      title: "Result and the ? operator",
      minutes: 45,
      xp: 150,
      concepts: ["Result<T, E>", "custom error enum", "?", "early return", "parse", "error propagation", "match guards", "split and collect"],
      learn: md`### When things go wrong, return it

You met \`Result\` in lesson 4 when \`parse\` could fail. Now you will use it the way real Rust programs do: your own functions return it, with your own error type, and the \`?\` operator passes failures upward without clutter.

~~~rust
enum Result<T, E> {
    Ok(T),     // success, carrying the value
    Err(E),    // failure, carrying the reason
}
~~~

There are no exceptions in Rust. A function that can fail says so **in its signature**:

~~~rust
fn parse_sample(line: &str) -> Result<Sample, IntakeError>
~~~

Read it as: "give me a line of text and I will return either a \`Sample\` or an \`IntakeError\`". A caller cannot ignore the second possibility without writing something that shows they ignored it (\`unwrap\`, \`expect\`, or a \`_\` arm). Every point where a failure is possible is visible in the code.

### Modelling your errors as an enum

Different failures call for different reactions, and each carries different data. That is what an enum is for:

~~~rust
#[derive(Debug)]
enum IntakeError {
    WrongFieldCount(usize),     // how many fields we found
    BadNumber(String),          // the text that was not a number
    NegativeDepth(i32),         // the impossible depth
}
~~~

A method can turn it into a sentence for people (the standard way is the \`Display\` trait, which the next project covers; a plain method does the same job today):

~~~rust
impl IntakeError {
    fn describe(&self) -> String {
        match self {
            IntakeError::WrongFieldCount(found) => format!("expected 4 fields, found {found}"),
            IntakeError::BadNumber(text) => format!("\"{text}\" is not a valid number"),
            IntakeError::NegativeDepth(depth) => format!("depth {depth} is negative"),
        }
    }
}
~~~

### The \`?\` operator

Without it, calling a function that returns a \`Result\` inside another one is repetitive:

~~~rust
let id = match parse_unsigned(parts[0]) {
    Ok(number) => number,
    Err(error) => return Err(error),
};
~~~

The \`?\` operator is exactly that, in one character:

~~~rust
let id = parse_unsigned(parts[0])?;       // on Ok, the number; on Err, return that error from THIS function
~~~

So a function can read as a straight line of "do this, then this, then this", and the first failure leaves early with its error. Rules for \`?\`:

- It only works inside a function whose return type is a \`Result\` (or an \`Option\`, as last time). In \`main\` with no return type you get error[E0277]: the \`?\` operator can only be used in a function that returns \`Result\` or \`Option\`. Use a \`match\` there, as the lesson's loop does.
- The error type has to fit. The error in the \`Err\` is converted with the \`From\` trait when the types differ. That is how big programs combine many kinds of errors, and it is the heart of the next project.

### A parser built from small steps

~~~rust
fn parse_depth(text: &str) -> Result<i32, IntakeError> {
    match text.trim().parse::<i32>() {
        Ok(depth) if depth < 0 => Err(IntakeError::NegativeDepth(depth)),   // a guard
        Ok(depth) => Ok(depth),
        Err(_) => Err(IntakeError::BadNumber(text.trim().to_string())),
    }
}

fn parse_sample(line: &str) -> Result<Sample, IntakeError> {
    let parts: Vec<&str> = line.split(',').collect();
    if parts.len() != 4 {
        return Err(IntakeError::WrongFieldCount(parts.len()));
    }
    let id = parse_unsigned(parts[0])?;
    let depth = parse_depth(parts[2])?;
    let weight = parse_unsigned(parts[3])?;
    Ok(Sample::new(id, parts[1].trim(), depth, Some(weight)))
}
~~~

Three things to notice. The **guard** (\`Ok(depth) if depth < 0\`) validates a parsed value: parsing success is not the same as a sensible number. The **early \`return Err(...)\`** is a plain return. And the success path ends with \`Ok(...)\`, with no semicolon, because it is the function's value.

### Using the results

At the edge of your program, where you finally have to decide what failure *means*, you \`match\`:

~~~rust
match parse_sample(entry) {
    Ok(sample) => intake.push(sample),
    Err(error) => problems.push(format!("{entry} -> {}", error.describe())),
}
~~~

Good practice: report every problem, keep going with the good records, and never let one bad line stop the whole intake.

### \`unwrap\`, \`expect\` and friends

\`result.unwrap()\` returns the \`Ok\` value or panics with the error: *called \`Result::unwrap()\` on an \`Err\` value: ...*. \`expect("what went wrong")\` is the same with your own message. Fine for tests, scripts and "this cannot happen" situations. For anything that handles outside data, use \`match\` or \`?\`. You can also convert a \`Result\` into an \`Option\` with \`.ok()\` when you do not care why it failed.

### Common mistakes

- Using \`?\` in \`main\` or in a function that returns \`()\`.
- Calling \`unwrap()\` on input that a person typed.
- Returning \`Ok(value);\` with a semicolon, which turns the success value into \`()\` (E0308).
- One giant error type called \`Error\` with a string inside for everything. Variants with the data the handler needs are far more useful.
- Forgetting that parse succeeding does not mean the value is valid.`,
      mission: md`Samples arrive from the field as lines of text from a handheld logger: \`id,name,depth,weight\`. Some lines are good, some are damaged: a word where a number belongs, a missing field, a depth with a minus sign. The intake desk must keep every good record and write an exact explanation for every bad one.

You will parse each line with small functions that return \`Result\`, chain them with \`?\`, and describe each failure with your own error enum. When this lesson passes, the **Intake desk** lights up.`,
      tasks: [
        "Above the divider define #[derive(Debug)] enum IntakeError { WrongFieldCount(usize), BadNumber(String), NegativeDepth(i32) } with a describe(&self) -> String method: \"expected 4 fields, found N\", \"\\\"text\\\" is not a valid number\" and \"depth N is negative\"",
        "Write parse_unsigned(text: &str) -> Result<u32, IntakeError> and parse_depth(text: &str) -> Result<i32, IntakeError> (BadNumber for text that does not parse; parse_depth also rejects negatives with NegativeDepth)",
        "Write parse_sample(line: &str) -> Result<Sample, IntakeError>: split on ',' and collect, check there are 4 parts, then use ? for id (part 0), depth (part 2) and weight (part 3); build Sample::new(id, parts[1].trim(), depth, Some(weight))",
        "In main loop over the five intake lines. For Ok push the sample into intake and print Accepted #<id>: <name>; for Err push the note \"<line> -> <description>\" into problems and print Rejected <note>",
        "Print Intake: 2 accepted, 3 rejected and send intake (a Vec of cards), problems (&problems) and acceptedCount",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: the intake desk. Define these in this part of the file (above main):
// #[derive(Debug)]  enum IntakeError { WrongFieldCount(usize), BadNumber(String), NegativeDepth(i32) }
// impl IntakeError { fn describe(&self) -> String }    "expected 4 fields, found 2" / "\"deep\" is not a valid number" / "depth -5 is negative"
// fn parse_unsigned(text: &str) -> Result<u32, IntakeError>
// fn parse_depth(text: &str) -> Result<i32, IntakeError>            BadNumber, or NegativeDepth for a negative number
// fn parse_sample(line: &str) -> Result<Sample, IntakeError>        split(',') + collect, then use  ?  three times
${MAIN_DIVIDER}
// let intake_lines = ["104,kelp,12,90", "105,urchin,deep,40", "106,anemone", "107,shell,-5,10", "108,sponge,22,65"];
// let mut intake: Vec<Sample> = Vec::new();   let mut problems: Vec<String> = Vec::new();
// for entry in intake_lines { match parse_sample(entry) { Ok(sample) => ..., Err(error) => ... } }
// Print:  Accepted #104: kelp  /  Rejected 105,urchin,deep,40 -> "deep" is not a valid number  / ...
//         Intake: 2 accepted, 3 rejected
// scene keys: intake (a Vec of sample.card()), problems, acceptedCount
`,
      solutionAdd: rs`#[derive(Debug)]
enum IntakeError {
    WrongFieldCount(usize),
    BadNumber(String),
    NegativeDepth(i32),
}

impl IntakeError {
    fn describe(&self) -> String {
        match self {
            IntakeError::WrongFieldCount(found) => format!("expected 4 fields, found {found}"),
            IntakeError::BadNumber(text) => format!("\"{text}\" is not a valid number"),
            IntakeError::NegativeDepth(depth) => format!("depth {depth} is negative"),
        }
    }
}

fn parse_unsigned(text: &str) -> Result<u32, IntakeError> {
    match text.trim().parse::<u32>() {
        Ok(number) => Ok(number),
        Err(_) => Err(IntakeError::BadNumber(text.trim().to_string())),
    }
}

fn parse_depth(text: &str) -> Result<i32, IntakeError> {
    match text.trim().parse::<i32>() {
        Ok(depth) if depth < 0 => Err(IntakeError::NegativeDepth(depth)),
        Ok(depth) => Ok(depth),
        Err(_) => Err(IntakeError::BadNumber(text.trim().to_string())),
    }
}

fn parse_sample(line: &str) -> Result<Sample, IntakeError> {
    let parts: Vec<&str> = line.split(',').collect();
    if parts.len() != 4 {
        return Err(IntakeError::WrongFieldCount(parts.len()));
    }
    let id = parse_unsigned(parts[0])?;
    let depth = parse_depth(parts[2])?;
    let weight = parse_unsigned(parts[3])?;
    Ok(Sample::new(id, parts[1].trim(), depth, Some(weight)))
}
${MAIN_DIVIDER}
// Lesson 15: the intake desk.
let intake_lines = [
    "104,kelp,12,90",
    "105,urchin,deep,40",
    "106,anemone",
    "107,shell,-5,10",
    "108,sponge,22,65",
];

let mut intake: Vec<Sample> = Vec::new();
let mut problems: Vec<String> = Vec::new();
for entry in intake_lines {
    match parse_sample(entry) {
        Ok(sample) => {
            println!("Accepted #{}: {}", sample.id, sample.name);
            intake.push(sample);
        }
        Err(error) => {
            let note = format!("{entry} -> {}", error.describe());
            println!("Rejected {note}");
            problems.push(note);
        }
    }
}
println!("Intake: {} accepted, {} rejected", intake.len(), problems.len());

let mut intake_cards = Vec::new();
for sample in &intake {
    intake_cards.push(sample.card());
}
scene("intake", intake_cards);
scene("problems", &problems);
scene("acceptedCount", intake.len());`,
      explanation:
        "Each small parser returns a Result with the same error enum, so parse_sample can chain them with ?: the first Err leaves the function immediately and carries the error, and a success continues to the next line. The field-count check is an early return Err(...). The guard in parse_depth rejects -5 even though it parses fine. In main the final decision is made with match: good records go into intake, and every bad line produces a note that combines the original text with the error's description. Bad lines never stop the loop.",
      hints: [
        { id: "h1", title: "The error enum", content: "#[derive(Debug)] enum IntakeError { WrongFieldCount(usize), BadNumber(String), NegativeDepth(i32) } and impl IntakeError { fn describe(&self) -> String { match self { IntakeError::WrongFieldCount(found) => format!(\"expected 4 fields, found {found}\"), ... } } } There is one arm per variant." },
        { id: "h2", title: "Small parsers", content: "fn parse_unsigned(text: &str) -> Result<u32, IntakeError> { match text.trim().parse::<u32>() { Ok(number) => Ok(number), Err(_) => Err(IntakeError::BadNumber(text.trim().to_string())) } } parse_depth is the same with i32 and one more arm first: Ok(depth) if depth < 0 => Err(IntakeError::NegativeDepth(depth))," },
        { id: "h3", title: "parse_sample and the loop", content: "let parts: Vec<&str> = line.split(',').collect(); if parts.len() != 4 { return Err(IntakeError::WrongFieldCount(parts.len())); } let id = parse_unsigned(parts[0])?; ... Ok(Sample::new(id, parts[1].trim(), depth, Some(weight))) In main: for entry in intake_lines { match parse_sample(entry) { Ok(sample) => {...} Err(error) => {...} } }" },
      ],
      tests: [
        {
          id: "t1",
          description: "Good lines are accepted",
          assertionCode: js`
assert(lines.includes("Accepted #104: kelp"), 'Print "Accepted #104: kelp" for the good line 104,kelp,12,90.');
assert(lines.includes("Accepted #108: sponge"), 'Print "Accepted #108: sponge" for the good line 108,sponge,22,65.');`,
        },
        {
          id: "t2",
          description: "A word where a number belongs is rejected with BadNumber",
          assertionCode: js`assert(lines.includes('Rejected 105,urchin,deep,40 -> "deep" is not a valid number'), 'Print the line: Rejected 105,urchin,deep,40 -> "deep" is not a valid number');`,
        },
        {
          id: "t3",
          description: "A short line is rejected with WrongFieldCount",
          assertionCode: js`assert(lines.includes("Rejected 106,anemone -> expected 4 fields, found 2"), 'Print the line: Rejected 106,anemone -> expected 4 fields, found 2');`,
        },
        {
          id: "t4",
          description: "A negative depth is rejected by the guard",
          assertionCode: js`assert(lines.includes("Rejected 107,shell,-5,10 -> depth -5 is negative"), 'Print the line: Rejected 107,shell,-5,10 -> depth -5 is negative');`,
        },
        {
          id: "t5",
          description: "The intake desk shows what was kept and what was refused",
          assertionCode: js`
assert(lines.includes("Intake: 2 accepted, 3 rejected"), 'Print the line "Intake: 2 accepted, 3 rejected".');
assertEqual(scene.acceptedCount, 2, "acceptedCount");
assertEqual(scene.problems.length, 3, "problems (one note per bad line)");
assertEqual(scene.intake.map((s) => s.name), ["kelp", "sponge"], "intake names");
assertEqual(scene.intake.map((s) => s.weightG), [90, 65], "intake weightG");`,
        },
      ],
      unlocks: ["rs-intake"],
      checks: [
        {
          prompt: "What does the `?` do when the `Result` it is applied to is an `Err`?",
          question: {
            type: "choice",
            options: [
              "Panics with the error",
              "Returns that error from the enclosing function immediately",
              "Ignores the error and continues with a default value",
              "Prints the error and continues",
            ],
            answer: 1,
          },
          explanation: "`?` is shorthand for 'on Ok, give me the value; on Err, return the error from this function'. That keeps the happy path in a straight line while every failure still propagates.",
        },
        {
          prompt: "You put `let n = parse_depth(text)?;` inside `fn main()` (which has no return type). What happens?",
          question: {
            type: "choice",
            options: [
              "It works and ends the program on an error",
              "error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option`",
              "The error is silently ignored",
              "It becomes a warning",
            ],
            answer: 1,
          },
          explanation: "`?` has to be able to return something, and `main` returns `()`. Either use `match`, or change the function's return type to `Result<(), SomeError>` so `?` has a place to send the error.",
        },
        {
          prompt: "Why is `IntakeError::NegativeDepth(i32)` better than returning a plain `String` error?",
          question: {
            type: "choice",
            options: [
              "Callers can match on the variant and use the exact data, and the compiler checks every case is handled",
              "Strings cannot be returned from functions",
              "Enums are faster to print",
              "It makes the function shorter",
            ],
            answer: 0,
          },
          explanation: "An error enum is data you can decide on: a handler can treat `BadNumber` differently from `WrongFieldCount` and read their contents, and adding a variant makes every `match` that ignores it fail to compile.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "rust-basics-16-report",
      title: "HashMap, iterators and the station report",
      minutes: 50,
      xp: 200,
      concepts: ["HashMap", "entry", "or_insert", "iterators", "closures", "filter", "map", "filter_map", "sum", "count", "collect", "use"],
      learn: md`### \`HashMap\`: look things up by key

A \`Vec\` is found by position. A **\`HashMap<K, V>\`** is found by *key*: give it a key and get the value, fast, however many entries there are. It lives in the standard library, so you bring it into scope with a \`use\` line (the type is not in the default prelude):

~~~rust
use std::collections::HashMap;

let mut zone_counts: HashMap<String, u32> = HashMap::new();
zone_counts.insert(String::from("deep"), 1);
~~~

Forget the \`use\` and you get error[E0433]: failed to resolve: use of undeclared type \`HashMap\`, with the fix printed under it. In this file the \`use\` line goes above the divider, with the other items.

~~~rust
zone_counts.get("deep")            // Option<&u32>: Some(&1) or None
zone_counts.contains_key("deep")   // bool
zone_counts.remove("deep")         // Option<u32>
zone_counts.len()
~~~

\`get\` returns an \`Option\` for the same reason as everywhere else: the key might not be there. Indexing with \`zone_counts["deep"]\` skips the Option and **panics** on a missing key, so use it only when you are sure.

**Ownership:** \`insert\` moves the key and the value *into* the map. The map owns them from then on. Keys must be hashable and comparable (strings, integers, chars, tuples of those; \`f64\` is not).

### Counting: the \`entry\` API

"Add one to the count for this key, starting from zero if it is new" is so common that it has its own method:

~~~rust
let count = zone_counts.entry(String::from("deep")).or_insert(0);
*count += 1;
~~~

\`entry(key)\` finds or reserves the slot; \`or_insert(0)\` puts 0 there if it was empty; the result is a \`&mut u32\` pointing into the map, which you change through the star. It is one lookup instead of three, and it avoids every "does the key exist yet?" branch.

**Order:** a HashMap has **no defined order**. Iterating twice, or on a different run, may give a different sequence. If the order matters for display, sort the keys, or walk a list of the keys in the order you want, as the report below does.

### Iterators: pipelines over collections

You have been writing loops that look at every item and update some variables. An **iterator** pipeline says the same thing as a chain of steps. \`.iter()\` starts one; **adaptors** transform it; a **consumer** at the end produces the result.

~~~rust
let weighed_g: u32 = all_samples.iter().filter_map(|s| s.weight_g).sum();
let deep_count = all_samples.iter().filter(|s| s.depth_m >= 30).count();
let names: Vec<String> = all_samples.iter().map(|s| s.name.clone()).collect();
~~~

- **Adaptors** (lazy, they do nothing by themselves): \`filter(keep?)\`, \`map(change)\`, \`filter_map(change or skip)\`, \`rev()\`, \`take(n)\`, \`enumerate()\`.
- **Consumers** (they run the pipeline): \`sum()\`, \`count()\`, \`collect()\`, \`max()\`, \`min()\`, \`any(...)\`, \`all(...)\`, \`find(...)\`.
- \`sum()\` and \`collect()\` have to know their result type, so annotate the variable (\`let total: u32 = ...\`) or use the turbofish (\`.sum::<u32>()\`). Without it: error[E0283]: type annotations needed.

Iterators are **lazy** and compile to the same machine code as a hand-written loop. There is no cost for writing them in this style. That is called a *zero-cost abstraction*, and it is a design goal of the language.

### Closures: tiny anonymous functions

The \`|s| s.weight_g\` above is a **closure**: parameters between the bars, then the expression. \`|s| s.depth_m >= 30\` takes a sample and returns a bool. A closure can use variables from where it was written. Their types are inferred, so you rarely annotate them.

Inside \`filter\` the closure receives a reference to what the iterator yields. With \`.iter()\` that is already a reference, so you get a reference to a reference (\`&&Sample\`), but field access and method calls dereference for you, so \`s.depth_m\` and \`drone.needs_charge()\` just work.

### A string with a lifetime: \`&'static str\`

The helper below returns text chosen from literals:

~~~rust
fn zone_for(depth_m: i32) -> &'static str {
    if depth_m < 20 { "shallow" } else if depth_m < 30 { "mid-water" } else { "deep" }
}
~~~

A literal lives for the entire run of the program, which is what \`'static\` says. Writing plain \`-> &str\` here would be error[E0106]: missing lifetime specifier, because the function has no input reference for the result to borrow from. Returning an owned \`String\` would work too.

### Moves, once more

\`let mut all_samples = catalogue;\` **moves** the catalogue into a new name, and \`all_samples.extend(intake);\` moves every sample out of \`intake\`. After these lines the old names are gone and the compiler would tell you so (E0382). That is the plan: we are finished with them. The iterator chains afterwards only borrow \`all_samples\`.

### Common mistakes

- Forgetting the consumer. \`all_samples.iter().map(...)\` alone does nothing.
- Missing type annotation for \`sum\` or \`collect\`.
- Expecting HashMap iteration order to match insertion order.
- Writing \`map[key]\` for a key that might be missing.
- Turning every pipeline into one unreadable 200-character line. A loop is still the right choice when the body needs several steps.

### You made it

This is the end of the Foundations path. Your station reads input, makes decisions, loops, owns and borrows its data, models drones, commands, samples and errors with its own types, and produces a report. You have met nearly every concept that makes Rust unusual (ownership, borrowing, enums, \`Option\`, \`Result\`), and you used the compiler as a collaborator throughout. The next projects of this path build on exactly these ideas: lifetimes and error types in a cargo manifest, traits and generics in a drone fleet, and threads and channels in a key-value server.`,
      mission: md`End of the shift. The commander wants one report: how many dives and how deep, how many samples are catalogued and how much they weigh, how the samples spread over depth zones, and which drones need charging.

You will merge the catalogue and the intake into one list, use iterator pipelines to total and filter, count samples per zone with a \`HashMap\`, and print the final station report. When this lesson passes, the **Station report** lights up and every module of Halcyon is live.`,
      tasks: [
        "Above the divider add use std::collections::HashMap; and fn zone_for(depth_m: i32) -> &'static str (below 20 shallow, below 30 mid-water, otherwise deep)",
        "Merge the lists: let mut all_samples = catalogue; all_samples.extend(intake); Then weighed_g: u32 with iter().filter_map(|s| s.weight_g).sum(), deep_count with filter(|s| s.depth_m >= 30).count(), and names: Vec<String> with map(|s| s.name.clone()).collect()",
        "Find deepest_dive with *dive_log.iter().max().unwrap_or(&0) and mean_depth by reusing your average_depth function from lesson 10",
        "Count samples per zone in a HashMap<String, u32> using entry(...).or_insert(0) and *count += 1",
        "Move the drones into let fleet = vec![manta, pip, spare]; and collect the names of those that need_charge() into needs_charge: Vec<String> with filter and map",
        "Print the eight report lines (see the starter) and send fleet (cards), zoneCounts (&zone_counts), needsCharge (&needs_charge) and report: a Json with dives, deepest, meanDepth, samples, weighedG, deepSamples and needsCharge",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: the station report. Add these in this part of the file (above main):
// use std::collections::HashMap;
// fn zone_for(depth_m: i32) -> &'static str          < 20 "shallow", < 30 "mid-water", otherwise "deep"
${MAIN_DIVIDER}
// 1. let mut all_samples = catalogue;   all_samples.extend(intake);
//    let weighed_g: u32 = all_samples.iter().filter_map(|s| s.weight_g).sum();
//    let deep_count = all_samples.iter().filter(|s| s.depth_m >= 30).count();
//    let names: Vec<String> = all_samples.iter().map(|s| s.name.clone()).collect();
// 2. let deepest_dive = *dive_log.iter().max().unwrap_or(&0);    let mean_depth = average_depth(&dive_log);
// 3. let mut zone_counts: HashMap<String, u32> = HashMap::new();
//    for sample in &all_samples { let count = zone_counts.entry(zone_for(sample.depth_m).to_string()).or_insert(0); *count += 1; }
// 4. let fleet = vec![manta, pip, spare];
//    let needs_charge: Vec<String> = fleet.iter().filter(|drone| drone.needs_charge()).map(|drone| drone.name.clone()).collect();
// Print these lines, in this order:
//    === Halcyon station report ===
//    Dives: 6 logged, deepest 35 m, average 24.8 m
//    Samples: 5 catalogued (brain coral, sea fan, sponge, kelp, sponge)
//    Weighed: 725 g, 1 from the deep zone
//    Zones:
//      shallow: 2     (then mid-water: 2, then deep: 1; use zone_counts.get(..).unwrap_or(&0), in that order)
//    Drones needing charge: Pip
// scene keys: fleet (a Vec of drone.card()), zoneCounts, needsCharge, report (Json: dives, deepest, meanDepth, samples, weighedG, deepSamples, needsCharge)
`,
      solutionAdd: rs`use std::collections::HashMap;

fn zone_for(depth_m: i32) -> &'static str {
    if depth_m < 20 {
        "shallow"
    } else if depth_m < 30 {
        "mid-water"
    } else {
        "deep"
    }
}
${MAIN_DIVIDER}
// Lesson 16: the station report.
let mut all_samples = catalogue;
all_samples.extend(intake);

let weighed_g: u32 = all_samples.iter().filter_map(|s| s.weight_g).sum();
let deep_count = all_samples.iter().filter(|s| s.depth_m >= 30).count();
let names: Vec<String> = all_samples.iter().map(|s| s.name.clone()).collect();

let deepest_dive = *dive_log.iter().max().unwrap_or(&0);
let mean_depth = average_depth(&dive_log);

let mut zone_counts: HashMap<String, u32> = HashMap::new();
for sample in &all_samples {
    let count = zone_counts.entry(zone_for(sample.depth_m).to_string()).or_insert(0);
    *count += 1;
}

let fleet = vec![manta, pip, spare];
let needs_charge: Vec<String> = fleet
    .iter()
    .filter(|drone| drone.needs_charge())
    .map(|drone| drone.name.clone())
    .collect();

println!("=== Halcyon station report ===");
println!("Dives: {} logged, deepest {deepest_dive} m, average {mean_depth:.1} m", dive_log.len());
println!("Samples: {} catalogued ({})", all_samples.len(), names.join(", "));
println!("Weighed: {weighed_g} g, {deep_count} from the deep zone");
println!("Zones:");
for zone_name in ["shallow", "mid-water", "deep"] {
    let n = *zone_counts.get(zone_name).unwrap_or(&0);
    println!("  {zone_name}: {n}");
}
println!("Drones needing charge: {}", needs_charge.join(", "));

let mut fleet_cards = Vec::new();
for drone in &fleet {
    fleet_cards.push(drone.card());
}
scene("fleet", fleet_cards);
scene("zoneCounts", &zone_counts);
scene("needsCharge", &needs_charge);
scene(
    "report",
    Json::new()
        .with("dives", dive_log.len())
        .with("deepest", deepest_dive)
        .with("meanDepth", mean_depth)
        .with("samples", all_samples.len())
        .with("weighedG", weighed_g)
        .with("deepSamples", deep_count)
        .with("needsCharge", needs_charge.len()),
);`,
      explanation:
        "The catalogue and the intake are moved into one Vec, which the rest of the code only borrows. filter_map keeps the Some weights and drops the None ones, so sum() adds 420 + 150 + 90 + 65 = 725. filter and count find the one sample from 30 m or deeper. max() returns an Option<&i32>, which unwrap_or(&0) resolves. The entry API counts the zones in one lookup per sample: two shallow, two mid-water, one deep. The zones are printed in a fixed order because a HashMap has no order of its own. The drones are moved into the fleet Vec, and filter plus map pick out the names of those that need charging, which is only Pip.",
      hints: [
        { id: "h1", title: "Above the divider", content: "use std::collections::HashMap; fn zone_for(depth_m: i32) -> &'static str { if depth_m < 20 { \"shallow\" } else if depth_m < 30 { \"mid-water\" } else { \"deep\" } } Both belong above the divider line." },
        { id: "h2", title: "Iterator pipelines", content: "let mut all_samples = catalogue; all_samples.extend(intake); let weighed_g: u32 = all_samples.iter().filter_map(|s| s.weight_g).sum(); let deep_count = all_samples.iter().filter(|s| s.depth_m >= 30).count(); The annotation on weighed_g is what tells sum() what to produce." },
        { id: "h3", title: "HashMap and the fleet", content: "let mut zone_counts: HashMap<String, u32> = HashMap::new(); for sample in &all_samples { let count = zone_counts.entry(zone_for(sample.depth_m).to_string()).or_insert(0); *count += 1; } For the fleet: let fleet = vec![manta, pip, spare]; and fleet.iter().filter(|drone| drone.needs_charge()).map(|drone| drone.name.clone()).collect()" },
      ],
      tests: [
        {
          id: "t1",
          description: "The dive part of the report",
          assertionCode: js`
assert(lines.includes("=== Halcyon station report ==="), 'Start the report with the line "=== Halcyon station report ===".');
assert(lines.includes("Dives: 6 logged, deepest 35 m, average 24.8 m"), 'Print the line "Dives: 6 logged, deepest 35 m, average 24.8 m". The deepest dive comes from dive_log.iter().max(), the average from your average_depth function.');`,
        },
        {
          id: "t2",
          description: "The merged catalogue and its total weight",
          assertionCode: js`
assert(lines.includes("Samples: 5 catalogued (brain coral, sea fan, sponge, kelp, sponge)"), 'Print the line "Samples: 5 catalogued (brain coral, sea fan, sponge, kelp, sponge)". Merge intake into the catalogue first, then collect the names and join them with ", ".');
assert(lines.includes("Weighed: 725 g, 1 from the deep zone"), 'Print the line "Weighed: 725 g, 1 from the deep zone". filter_map skips the unweighed sample, and the deep zone starts at 30 m.');`,
        },
        {
          id: "t3",
          description: "A HashMap counts samples per zone",
          assertionCode: js`
assertEqual(scene.zoneCounts, { shallow: 2, "mid-water": 2, deep: 1 }, 'zoneCounts (use entry(...).or_insert(0) and send it with scene("zoneCounts", &zone_counts);)');
for (const line of ["Zones:", "  shallow: 2", "  mid-water: 2", "  deep: 1"]) {
  assert(lines.includes(line), 'Print the zone lines in a fixed order. Missing: "' + line + '"');
}`,
        },
        {
          id: "t4",
          description: "filter and map find the drones that need charging",
          assertionCode: js`
assertEqual(scene.needsCharge, ["Pip"], "needsCharge (only Pip is below 20% battery)");
assert(lines.includes("Drones needing charge: Pip"), 'Print the line "Drones needing charge: Pip" using needs_charge.join(", ").');
assert(Array.isArray(scene.fleet) && scene.fleet.length === 3, 'Send the three drone cards again from the fleet Vec: scene("fleet", fleet_cards);');
assertEqual(scene.fleet.map((d) => d.battery), [95, 15, 85], "fleet battery after the missions of lesson 13");`,
        },
        {
          id: "t5",
          description: "The report object holds the shift's totals",
          assertionCode: js`
const r = scene.report;
assert(r && typeof r === "object", 'Send the totals as one object: scene("report", Json::new().with("dives", ...)...);');
assertEqual(r.dives, 6, "report.dives");
assertEqual(r.deepest, 35, "report.deepest");
assertClose(r.meanDepth, 24.8333, 0.001, "report.meanDepth");
assertEqual(r.samples, 5, "report.samples");
assertEqual(r.weighedG, 725, "report.weighedG");
assertEqual(r.deepSamples, 1, "report.deepSamples");
assertEqual(r.needsCharge, 1, "report.needsCharge");`,
        },
      ],
      unlocks: ["rs-report"],
      checks: [
        {
          prompt: "What does this evaluate to?\n\n~~~rust\nlet total: u32 = [3, 5, 8].iter().filter(|n| **n > 4).sum();\n~~~",
          question: { type: "number", answer: 13 },
          explanation: "`filter` keeps 5 and 8 and `sum` adds them: 13. The consumer at the end (`sum`) is what runs the pipeline. The `**n` is because `iter()` yields references and `filter` passes a reference to that.",
        },
        {
          prompt: "You build `all_samples.iter().map(|s| s.name.clone());` and never call anything on it. What happens?",
          question: {
            type: "choice",
            options: [
              "Nothing runs: iterator adaptors are lazy until a consumer such as collect() or sum() pulls items through",
              "Every name is cloned immediately",
              "It panics",
              "It prints the names",
            ],
            answer: 0,
          },
          explanation: "Iterators are lazy. Adaptors like `map` and `filter` only describe the work; a consumer (`collect`, `sum`, `count`, `for`) makes it happen.",
        },
        {
          prompt: "A `HashMap<String, u32>` is printed by looping over it twice, in two different runs. Which statement is true?",
          question: {
            type: "choice",
            options: [
              "The order of entries is not defined, so sort the keys or use a fixed list when the order matters",
              "Entries come out in insertion order",
              "Entries come out alphabetically",
              "Entries come out in reverse insertion order",
            ],
            answer: 0,
          },
          explanation: "A HashMap makes no promise about iteration order. If you print a report, walk the keys in an order you choose (a sorted Vec of keys, or a fixed array) so the output is the same every time.",
        },
      ],
    },
  ],
};
