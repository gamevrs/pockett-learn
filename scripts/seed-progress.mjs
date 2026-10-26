// Prints a localStorage payload with the first N lessons of a project completed (reference solutions).
//   node scripts/seed-progress.mjs garage 7
process.env.NODE_NO_WARNINGS = "1";
import { solutionThrough } from "../src/engine/compose.ts";
import { flattenLessons } from "../src/engine/types.ts";
const mod = await import(`../src/content/projects/${process.argv[2]}.ts`);
const project = Object.values(mod).find((v) => v && v.slug && v.chapters);
const n = Number(process.argv[3] ?? 0);
const completed = {};
let xp = 0;
flattenLessons(project).slice(0, n).forEach((l, i) => {
  completed[l.id] = { at: new Date().toISOString(), code: solutionThrough(project, i), attempts: 1 };
  xp += l.xp;
});
const today = new Date();
const pad = (v) => String(v).padStart(2, "0");
console.log(JSON.stringify({ version: 2, xp, streak: 3, bestStreak: 3, lastActiveDate: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`, completed, drafts: {}, attempts: {}, hintsSeen: {}, audio: { enabled: false, volume: 0.6 } }));
