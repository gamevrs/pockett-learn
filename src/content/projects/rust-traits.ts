import type { Project } from "@/engine/types";
import { chapter1 } from "./rust-traits/ch1.ts";
import { chapter2 } from "./rust-traits/ch2.ts";
import { chapter3 } from "./rust-traits/ch3.ts";
import { chapter4 } from "./rust-traits/ch4.ts";
import { FLEET_TOOLKIT } from "./rust-traits/toolkit.ts";

/**
 * Drone Fleet (Rust, Advanced): the dispatch software of Skerry Post, a courier service that links the
 * islands of an archipelago with drones. One Rust program grows lesson by lesson, and each lesson lights
 * another panel of the fleet board.
 *
 * How it works (the compiled-language path, see docs/ARCHITECTURE.md):
 *  - The program is a normal `fn main()` file. Lesson 1's starter carries the skeleton (the drone structs
 *    and `fn main()`). From lesson 2 on, a lesson's text may hold MAIN_DIVIDER (engine/compose.ts): what is
 *    above it (traits, structs, impls, functions) goes before `fn main()`, what is below it joins main's body.
 *  - `scene("key", value)` and the `Json` builder are the project's hidden `prelude` (toolkit.ts), compiled in
 *    front of the learner's file; compiler line numbers are shifted back to the learner's own. `scene` prints one
 *    `@scene {json}` line. The board reads those keys, and the lessons' checks read them as `scene.key`.
 *  - When a build fails, the board gets a `build_error` ({ type, message, line }) where `type` is the rustc error
 *    code (E0277...) or "Panic" for a crash while running.
 *  - No stdin, no threads, std only: every program is deterministic.
 *
 * Scene keys by lesson (all optional, all read defensively):
 *   1 roster   2 carriers   3 monomorphs   4 plans standby   5 hangar lowBattery   6 choice   7 parcelCard   8 conversions
 *   9 harbour   10 ranking   11 charging   12 adaptors   13 depot   14 ledgerView   15 rigs   16 dispatchDay
 */
export const rustTraits: Project = {
  slug: "rust-traits",
  language: "rust",
  prelude: FLEET_TOOLKIT,
  title: "Drone Fleet",
  tagline: "Command a fleet through traits, generics, trait objects, operators, iterators and shared state.",
  pitch:
    "Skerry Post delivers parcels between the islands of an archipelago, and you write its dispatch software in Rust. Start with the question 'what can it do?': traits, default methods, generics with bounds. Then mix drones in one Vec with trait objects, add your own operators and orderings, write an Iterator, and finally let the whole fleet share one depot with Rc and RefCell. The fleet board draws each drone's type, battery, route, the trait calls dispatched and the shared depot as your code produces them.",
  emoji: "🛸",
  difficulty: "Advanced",
  hours: 9,
  sceneId: "rust-traits",
  prerequisites: ["rust-inventory"],
  accent: { from: "#f0a070", to: "#9a3412" },
  controls: ["Run builds your program (2 to 6 s)", "Click a panel to open it", "Output / Scene data tabs", "Compiler errors are explained, not just printed"],
  skills: [
    "traits",
    "default methods",
    "supertraits",
    "generics & bounds",
    "where clauses",
    "impl Trait",
    "Box<dyn Trait>",
    "dyn vs generics",
    "derive & Display",
    "From & Default",
    "operator overloading",
    "Ord & PartialOrd",
    "implementing Iterator",
    "associated types & consts",
    "Rc<RefCell<T>>",
  ],
  features: [
    { id: "df-roster", title: "Roster", blurb: "Every drone on the pads, with its kind, callsign and battery, asked through one trait.", emoji: "📋" },
    { id: "df-abilities", title: "Carrier desk", blurb: "Which drones lift a 6 kg parcel, and who uses the shared rule or overrides it.", emoji: "📦" },
    { id: "df-generics", title: "Copies made", blurb: "The specialised copies the compiler writes for each generic call.", emoji: "🧬" },
    { id: "df-bounds", title: "Drop plans", blurb: "Plans that need two abilities at once, and the standby unit hidden behind impl Trait.", emoji: "🎯" },
    { id: "df-hangar", title: "Hangar", blurb: "Different drones in one list, each box with its data pointer and its vtable pointer.", emoji: "🏚️" },
    { id: "df-choice", title: "Pads vs hangar", blurb: "Generic pads next to a trait-object hangar, and what each design costs.", emoji: "⚖️" },
    { id: "df-derives", title: "Parcel card", blurb: "One parcel shown by Display and Debug, plus the equality checks derive wrote for you.", emoji: "🏷️" },
    { id: "df-convert", title: "Conversions", blurb: "Values made by Default, derive(Default), From and Into.", emoji: "🔄" },
    { id: "df-harbour", title: "Harbour grid", blurb: "The map with every flight vector your operators compute, and the route drawn through its stops.", emoji: "🗺️" },
    { id: "df-ranking", title: "Bid ranking", blurb: "Bids sorted by your Ord, urgency levels and decimal loads in order.", emoji: "🏅" },
    { id: "df-charging", title: "Charging dock", blurb: "Your Charging iterator filling a battery tick by tick, next to the stops Hops walked.", emoji: "🔋" },
    { id: "df-pipeline", title: "Route report", blurb: "Leg lengths, totals and an item count after every stage of the pipeline.", emoji: "⛓️" },
    { id: "df-depot", title: "Shared depot", blurb: "One depot with a ticket for every courier, and the holder count rising and falling.", emoji: "🏢" },
    { id: "df-ledger", title: "Ledger", blurb: "A ledger every runner writes to, with the run-time borrow check shown refusing a second writer.", emoji: "📒" },
    { id: "df-rigs", title: "Rigs", blurb: "Post pouch and crate rack drawn as rows of slots from their associated constants and types.", emoji: "🎒" },
    { id: "df-board", title: "Dispatch board", blurb: "The finished dispatch day: the shelf, the runners, the log and every panel live.", emoji: "🛰️" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
