import type { Project } from "@/engine/types";
import { chapter1 } from "../cargo-control/chapter1.ts";
import { chapter2 } from "../cargo-control/chapter2.ts";
import { chapter3 } from "../cargo-control/chapter3.ts";
import { chapter4 } from "../cargo-control/chapter4.ts";

/**
 * Cargo Control: run a shipping depot that never crashes, however broken the paperwork.
 * Intermediate Python: exceptions, context managers, JSON, validation and logging.
 *
 * The scene (src/scenes/cargo-control) calls these learner functions, each only once the lesson
 * that writes it is passed (see FEATURES below):
 *   crate_weight(manifest)                   L1   may raise: the scene shows the real crash
 *   safe_weight(manifest) -> float | None    L2
 *   weigh_crate(manifest) -> outcome dict    L3
 *   triage(manifest) -> verdict dict         L4
 *   weight_report(manifest) -> chain dict    L5
 *   dock(manifest) -> dict, bays_open()      L6
 *   handle_crate(manifest), recent_audit(n)  L7
 *   safe_read(text) -> reader dict           L8
 *   stamp(manifest) -> JSON text             L9
 *   validate_manifest(manifest) -> problems  L10
 *   format_problems(manifest) -> problems    L11
 *   validate(data, SCHEMA) -> problems, SCHEMA variable   L12
 *   log_lines(n) -> list of text             L13
 *   process_manifest(text) -> verdict dict   L14
 */

export const cargoControl: Project = {
  slug: "cargo-control",
  prerequisites: ["signal-lab"],
  title: "Cargo Control",
  tagline: "Keep a shipping depot running with exceptions, JSON and validation.",
  pitch:
    "You run the control system of a busy shipping depot. Cargo manifests arrive as JSON, and half of them are broken: missing fields, wrong types, bad container IDs, impossible weights, text that is not even JSON. Your code decides what gets loaded, quarantined or rejected, explains why, and never, ever crashes.",
  emoji: "📦",
  difficulty: "Intermediate",
  hours: 6,
  sceneId: "cargo-control",
  accent: { from: "#f59e0b", to: "#b45309" },
  controls: ["Next crate", "Pause / resume the belt", "Throw chaos", "Send your own manifest"],
  skills: ["tracebacks", "try / except / else / finally", "custom exceptions", "raise from", "context managers", "JSON", "validation", "regex formats", "logging"],
  features: [
    { id: "cc-gate", title: "Depot gate", blurb: "The belt runs and every manifest is scanned. Unprotected code crashes for real.", emoji: "🚧" },
    { id: "cc-scale", title: "Safe scale", blurb: "Bad weights no longer take the gate down.", emoji: "⚖️" },
    { id: "cc-tally", title: "Error tally", blurb: "Every failure is counted by the type of error that caused it.", emoji: "📊" },
    { id: "cc-routing", title: "Routing bays", blurb: "Crates are sent to LOAD, QUARANTINE or REJECT with a reason.", emoji: "🔀" },
    { id: "cc-trace", title: "Incident trace", blurb: "See the chain of causes behind every rejection.", emoji: "🔗" },
    { id: "cc-docks", title: "Dock bays", blurb: "Bays are always released, even when a crate fails.", emoji: "⚓" },
    { id: "cc-audit", title: "Audit trail", blurb: "Every crate leaves a sealed record.", emoji: "🗂️" },
    { id: "cc-reader", title: "JSON reader", blurb: "Raw manifest text is parsed, and broken JSON is pinpointed by line and column.", emoji: "📖" },
    { id: "cc-receipt", title: "Receipts", blurb: "Decisions are written out as tidy, sorted JSON.", emoji: "🧾" },
    { id: "cc-fields", title: "Field checks", blurb: "Every problem with a manifest is found at once, not just the first.", emoji: "✅" },
    { id: "cc-formats", title: "Format checks", blurb: "Container IDs and emails are verified, check digit and all.", emoji: "🔢" },
    { id: "cc-schema", title: "Schema rules", blurb: "The rules are data, and one generic function enforces them.", emoji: "📐" },
    { id: "cc-oplog", title: "Ops log", blurb: "The depot keeps a proper operations log.", emoji: "📜" },
    { id: "cc-chaos", title: "Chaos-proof gate", blurb: "The full pipeline survives anything you throw at it.", emoji: "🌪️" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
