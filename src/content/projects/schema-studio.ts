import type { Project } from "@/engine/types";
import { buildSetup } from "./schema-studio/seed.ts";
import { chapter1 } from "./schema-studio/ch1.ts";
import { chapter2 } from "./schema-studio/ch2.ts";
import { chapter3 } from "./schema-studio/ch3.ts";
import { chapter4 } from "./schema-studio/ch4.ts";

/**
 * Schema Studio: the learner designs the database for Lantern Yard, a community workshop, from a
 * one-page brief to a schema that refuses bad data by itself. One growing schema.sql file builds
 * the whole thing, lesson by lesson.
 *
 * The hidden `setup` (schema-studio/seed.ts) holds only the workshop's two relics: the shared
 * spreadsheet `legacy_sheet` and the door controller's `door_log`. Everything else is the learner's.
 *
 * The scene (src/scenes/schema-studio) reads what the runtime hands every SQL scene: `tables` (with
 * columns, keys, foreign keys, indexes, triggers and the stored CREATE text), `results` and `log`
 * (the statement diary, including statements marked `-- expect error` and how they were refused).
 * It draws a live ER diagram plus one panel per lesson:
 *
 *   sketch       a result with columns a, b, cardinality      migrations  columns version, name
 *   firewall     log entries marked expected                  plan        EXPLAIN QUERY PLAN results
 *   transactions BEGIN / COMMIT / ROLLBACK in the log          audit       columns table_name, row_id, action
 */
export const schemaStudio: Project = {
  slug: "schema-studio",
  language: "sql",
  setup: buildSetup(),
  prerequisites: ["season-analytics"],
  title: "Schema Studio",
  tagline: "Design a schema that refuses bad data: constraints, indexes, triggers and safe migrations.",
  pitch:
    "Lantern Yard is a community workshop that has run for two years on a shared spreadsheet and a badge reader. You are hired to give it a real database. Starting from a one-page brief you sketch the model, create the tables, and teach them to refuse bad rows with keys, checks and foreign keys. Then you untangle the spreadsheet into clean tables, speed up lookups with indexes you can read in the query plan, hide joins behind views, keep an audit trail with triggers, change several tables atomically, roll out a schema change without downtime, and finish with a booking schema that cannot be double-booked.",
  emoji: "🗄️",
  difficulty: "Advanced",
  hours: 7,
  sceneId: "schema-studio",
  accent: { from: "#818cf8", to: "#4338ca" },
  controls: [],
  skills: [
    "data modelling",
    "CREATE TABLE & types",
    "primary & unique keys",
    "CHECK constraints",
    "foreign keys",
    "normalisation",
    "junction tables",
    "indexes & EXPLAIN",
    "partial & expression indexes",
    "views",
    "triggers",
    "transactions",
    "UPSERT & RETURNING",
    "JSON & generated columns",
    "schema migrations",
  ],
  features: [
    { id: "ss-sketch", title: "Design sketch", blurb: "Entities and cardinalities drawn from your model, as a dashed blueprint.", emoji: "✏️" },
    { id: "ss-tables", title: "ER diagram", blurb: "Every table you create appears as a card with its columns and types.", emoji: "🗂️" },
    { id: "ss-firewall", title: "Constraint firewall", blurb: "Bad rows turned away, with the database's own reason.", emoji: "🧱" },
    { id: "ss-keys", title: "Keys & uniqueness", blurb: "Primary and unique keys marked on every card.", emoji: "🔑" },
    { id: "ss-checks", title: "Business rules", blurb: "CHECK constraints listed by name on the tables that own them.", emoji: "✅" },
    { id: "ss-links", title: "Foreign keys", blurb: "Arrows between tables, labelled with what happens on delete.", emoji: "🔗" },
    { id: "ss-refactor", title: "Normal forms", blurb: "The spreadsheet's columns finding their proper homes.", emoji: "✂️" },
    { id: "ss-junction", title: "Many-to-many", blurb: "Junction tables highlighted between the two sides they join.", emoji: "↔️" },
    { id: "ss-plan", title: "Query plans", blurb: "EXPLAIN QUERY PLAN flipping from SCAN to SEARCH once an index exists.", emoji: "🔍" },
    { id: "ss-smart-indexes", title: "Smart indexes", blurb: "Partial, expression and unique-partial indexes, told apart.", emoji: "🎯" },
    { id: "ss-views", title: "Views", blurb: "The stable interface other people query instead of your tables.", emoji: "👓" },
    { id: "ss-audit", title: "Triggers & audit", blurb: "An audit trail that writes itself when status changes.", emoji: "📜" },
    { id: "ss-tx", title: "Transaction console", blurb: "BEGIN, COMMIT, ROLLBACK and savepoints, with what each one kept or undid.", emoji: "↩️" },
    { id: "ss-upsert", title: "Upserts & RETURNING", blurb: "Rows written or skipped on conflict, and what came back.", emoji: "⚡" },
    { id: "ss-json", title: "JSON & generated columns", blurb: "Flexible specs stored as JSON, with one field promoted to an indexed column.", emoji: "🧩" },
    { id: "ss-migrations", title: "Migration timeline", blurb: "Versioned steps: expand, backfill, switch reads, contract.", emoji: "🛤️" },
    { id: "ss-bookings", title: "Collision-proof bookings", blurb: "Half-hour slots that can only be held once, and a utilisation report.", emoji: "📅" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
