// Builds src/content/projects/smart-home.ts from the lesson folders next to this file.
//   node content-src/smart-home/build.mjs [outPath]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? join(here, "..", "..", "src", "content", "projects", "smart-home.ts");
const project = JSON.parse(readFileSync(join(here, "project.json"), "utf8"));

const rd = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

function tpl(text) {
  // normal template literal: escape backslash, backtick and ${
  return "`" + text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
}
function raw(text, where) {
  const rows = text.split("\n");
  const bad = rows.findIndex((l) => l.includes("`") || l.includes("${"));
  if (bad >= 0) throw new Error(`${where}: line ${bad + 1} contains a backtick or dollar-brace: ${rows[bad]}`);
  return "py`" + text + "`";
}
const q = (s) => JSON.stringify(s);

// Deterministic shuffle so the right answer does not always sit in the same slot.
function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function question(qn, prompt) {
  if (qn.type !== "choice" || typeof qn.answer !== "number") return JSON.stringify(qn);
  const rand = rng(hashSeed(prompt));
  const order = qn.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return JSON.stringify({ ...qn, options: order.map((i) => qn.options[i]), answer: order.indexOf(qn.answer) });
}

function lessonTs(num) {
  const dir = join(here, "lessons", num);
  const meta = JSON.parse(rd(join(dir, "meta.json")));
  const learn = rd(join(dir, "learn.md")).trim();
  const mission = rd(join(dir, "mission.md")).trim();
  const starter = rd(join(dir, "starter.py")).replace(/`([^`\n]*)`/g, '"$1"').trimEnd() + "\n";
  const solution = rd(join(dir, "solution.py")).trimEnd();
  const testsSrc = rd(join(dir, "tests.py"));
  if (!starter.includes("✏️ YOUR TURN")) throw new Error(`${num}: starter lacks marker`);
  // tests: blocks starting with "### id | description"
  const tests = [];
  let cur = null;
  for (const line of testsSrc.split("\n")) {
    const m = /^### (t\d+) \| (.+)$/.exec(line);
    if (m) {
      cur = { id: m[1], description: m[2].trim(), body: [] };
      tests.push(cur);
    } else if (cur) cur.body.push(line);
  }
  if (tests.length < 3) throw new Error(`${num}: needs at least 3 tests (has ${tests.length})`);
  const L = [];
  L.push(`        {`);
  L.push(`          id: ${q(meta.id)},`);
  L.push(`          title: ${q(meta.title)},`);
  L.push(`          minutes: ${meta.minutes},`);
  L.push(`          xp: ${meta.xp},`);
  L.push(`          concepts: ${JSON.stringify(meta.concepts)},`);
  L.push(`          learn: ${tpl(learn)},`);
  L.push(`          mission: ${tpl(mission)},`);
  L.push(`          tasks: [`);
  for (const t of meta.tasks) L.push(`            ${q(t)},`);
  L.push(`          ],`);
  L.push(`          starterAdd: ${raw(starter, num + " starter")},`);
  L.push(`          solutionAdd: ${raw(solution, num + " solution")},`);
  L.push(`          explanation: ${tpl(meta.explanation)},`);
  L.push(`          hints: [`);
  meta.hints.forEach((h, i) => L.push(`            { id: "h${i + 1}", title: ${q(h.title)}, content: ${tpl(h.content)} },`));
  L.push(`          ],`);
  L.push(`          tests: [`);
  for (const t of tests) {
    const body = t.body.join("\n").replace(/\s+$/, "");
    L.push(`            {`);
    L.push(`              id: ${q(t.id)},`);
    L.push(`              description: ${q(t.description)},`);
    L.push(`              assertionCode: ${raw(body, num + " " + t.id)},`);
    L.push(`            },`);
  }
  L.push(`          ],`);
  L.push(`          unlocks: ${JSON.stringify(meta.unlocks)},`);
  if (meta.checks?.length) {
    L.push(`          checks: [`);
    for (const c of meta.checks) {
      L.push(`            {`);
      L.push(`              prompt: ${tpl(c.prompt)},`);
      L.push(`              question: ${question(c.question, c.prompt)},`);
      L.push(`              explanation: ${tpl(c.explanation)},`);
      L.push(`            },`);
    }
    L.push(`          ],`);
  }
  L.push(`        },`);
  return L.join("\n");
}

const chapters = project.chapters
  .map((ch) => ({ ...ch, lessons: ch.lessons.filter((n) => existsSync(join(here, "lessons", n, "meta.json"))) }))
  .filter((ch) => ch.lessons.length)
  .map((ch) => {
    const lessons = ch.lessons.map(lessonTs).join("\n");
    return `    {\n      id: ${q(ch.id)},\n      title: ${q(ch.title)},\n      blurb: ${q(ch.blurb)},\n      lessons: [\n${lessons}\n      ],\n    },`;
  })
  .join("\n");

const features = project.features.map((f) => `    ${JSON.stringify(f).replace(/^\{/, "{ ").replace(/\}$/, " }").replace(/":/g, '": ').replace(/,"/g, ', "')},`).join("\n");

const header = `import type { Project } from "@/engine/types";

/**
 * Smart Home Hub: build the brain of a house in Python and watch it run a floor plan.
 *
 * Authoring notes:
 *  - Python goes in String.raw\`...\` (no backticks, no \${ inside). Prose goes in normal templates.
 *  - The scene (src/scenes/smart-home) reads these names from the learner's program:
 *      vars:   SUNRISE, SUNSET (minutes after midnight)
 *      hooks:  catalog(), snapshot(), command(id, action, value), routine_names(), run_routine(name),
 *              motion_detected(room), busiest_rooms(), preset_names(), run_preset(name), call_log(),
 *              world_event(name, payload), event_log(), bus_errors(), notifications(),
 *              recent_events(name, limit), daylight_map(), automations()
 *  - Every lesson's tests build their own objects, so they never depend on the order they run in.
 */
const py = String.raw;

export const smartHome: Project = {
  slug: ${q(project.slug)},
  title: ${q(project.title)},
  tagline: ${q(project.tagline)},
  pitch:
    ${q(project.pitch)},
  emoji: ${q(project.emoji)},
  difficulty: ${q(project.difficulty)},
  hours: ${project.hours},
  sceneId: ${q(project.sceneId)},
  prerequisites: ${JSON.stringify(project.prerequisites)},
  accent: ${JSON.stringify(project.accent).replace(/"from"/, "from").replace(/"to"/, "to").replace(/:/g, ": ").replace(/,/g, ", ").replace(/^\{/, "{ ").replace(/\}$/, " }")},
  controls: ${JSON.stringify(project.controls)},
  skills: ${JSON.stringify(project.skills)},
  features: [
${features}
  ],
  chapters: [
${chapters}
  ],
};
`;

writeFileSync(out, header);
console.log("wrote", out, header.length, "chars");
