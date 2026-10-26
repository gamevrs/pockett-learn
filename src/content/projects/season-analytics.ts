import type { Project } from "@/engine/types";
import { buildSetup } from "./season-analytics/seed.ts";
import { chapter1 } from "./season-analytics/ch1.ts";
import { chapter2 } from "./season-analytics/ch2.ts";
import { chapter3 } from "./season-analytics/ch3.ts";
import { chapter4 } from "./season-analytics/ch4.ts";

/**
 * Season Analytics: the learner is the analyst at a racing team and builds the season-analysis
 * dashboard from a whole championship of data (ten Grands Prix, thirteen drivers, ~5,000 laps).
 * One growing query.sql file powers the dashboard.
 *
 * The hidden `setup` (season-analytics/seed.ts) builds the database from a seeded simulation, so
 * every run and every check sees identical rows. The scene (src/scenes/season-analytics) gets
 * every result set the file produced and picks one per panel by the columns it returns, so a
 * panel lights up when the learner's query has the shape the lesson asks for:
 *
 *   benchmarks  rounds, entries, ...           form       best_finish, last_points
 *   leaders     code, points, gap              record     wins, podiums, dnfs
 *   qualifying  reached_q2, reached_q3         calendar   days_since_prev
 *   stewards    category, penalties            honours    honour, code, total
 *   pointsgrid  code, round, points, entered   h2h        driver_a, driver_b, a_ahead, b_ahead
 *   movers      round, code, gained            progression code, round, total
 *   pace        gap_pct, form3                 standings  pos, change, to_ahead
 *   strategy    stops, entries, avg_points     plan       EXPLAIN QUERY PLAN (id, parent, detail)
 *   championship pos, wins, tied_on_points
 */
export const seasonAnalytics: Project = {
  slug: "season-analytics",
  language: "sql",
  setup: buildSetup(),
  prerequisites: ["pit-wall"],
  title: "Season Analytics",
  tagline: "Answer season-long questions with subqueries, CTEs and window functions.",
  pitch:
    "Pit Wall covered one race. Now you are the analyst for Halcyon Racing and the whole 2026 championship is in the database: ten Grands Prix, thirteen drivers, five thousand laps. Each lesson answers a harder question (subqueries, CTEs, window functions, pivots, set operations, views) until the season dashboard shows the standings with position-change arrows, points progression, teammate head-to-heads, a race-pace heatmap and the championship decided by tiebreaks, all in SQL.",
  emoji: "📈",
  difficulty: "Intermediate",
  hours: 5,
  sceneId: "season-analytics",
  accent: { from: "#2dd4bf", to: "#0f766e" },
  controls: [],
  skills: [
    "subqueries",
    "correlated subqueries & EXISTS",
    "CTEs & recursive CTEs",
    "CASE & pivots",
    "NULL handling",
    "dates & strings",
    "UNION / INTERSECT / EXCEPT",
    "views",
    "window functions",
    "LAG / LEAD & frames",
    "join fan-out & EXPLAIN",
    "tiebreaks",
  ],
  features: [
    { id: "sa-benchmarks", title: "Season benchmarks", blurb: "Headline numbers from your scalar subqueries, plus the list of race winners.", emoji: "🎯" },
    { id: "sa-form", title: "Form guide", blurb: "Each driver's best finish and latest points, from correlated subqueries.", emoji: "📋" },
    { id: "sa-leaders", title: "Points table", blurb: "Season points and the gap to the leader, built with CTEs.", emoji: "🏆" },
    { id: "sa-record", title: "Win · podium · DNF record", blurb: "Stacked bars and a wet/dry split from conditional aggregation.", emoji: "📊" },
    { id: "sa-qualifying", title: "Qualifying ladder", blurb: "How far each driver gets on Saturday, counted around the NULLs.", emoji: "⏱️" },
    { id: "sa-calendar", title: "Season calendar", blurb: "Rounds on a timeline with the days between races.", emoji: "📅" },
    { id: "sa-stewards", title: "Steward reports", blurb: "Messy penalty text cleaned into categories.", emoji: "🧹" },
    { id: "sa-honours", title: "Honours board", blurb: "Winners, pole sitters and fastest laps from UNION ALL.", emoji: "🥇" },
    { id: "sa-grid", title: "Points by round", blurb: "A gap-free driver-by-round matrix from a recursive CTE.", emoji: "🧮" },
    { id: "sa-h2h", title: "Teammate head-to-head", blurb: "Who is ahead inside every team, from a self-join on your views.", emoji: "⚔️" },
    { id: "sa-movers", title: "Drivers of the day", blurb: "The biggest gainer each round, picked with ROW_NUMBER.", emoji: "🚀" },
    { id: "sa-progression", title: "Points progression", blurb: "A line chart of running totals, one line per driver.", emoji: "📈" },
    { id: "sa-pace", title: "Race pace heatmap", blurb: "Gap to the quickest car in every race, with a rolling average.", emoji: "🔥" },
    { id: "sa-standings", title: "Championship standings", blurb: "Positions with arrows from LAG, and gaps from LAG and LEAD.", emoji: "🗼" },
    { id: "sa-strategy", title: "Pit strategy", blurb: "Does stopping more often pay? Counts that add up, thanks to pre-aggregation.", emoji: "🔧" },
    { id: "sa-plan", title: "Query plan", blurb: "EXPLAIN QUERY PLAN before and after your index.", emoji: "🔍" },
    { id: "sa-championship", title: "Final championship", blurb: "Drivers' and constructors' titles with count-back tiebreaks.", emoji: "👑" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
