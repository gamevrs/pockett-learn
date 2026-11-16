// Writes src/fixtures/catalog.json: the app's catalog, in the exact shape of GET /api/app/catalog
// (contract §1), built from the site's own content. The app bundles it as the first-launch catalog
// (so Learn works offline on the very first open) and the unit tests read it.
//   node scripts/make-catalog-fixture.mjs        (from mobile/)
// Loads the real content through the site's resolve hook (../scripts/ts-alias-hooks.mjs) so "@/..." works in Node.
process.env.NODE_NO_WARNINGS = "1";
import { register } from "node:module";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const SRC = path.join(REPO, "src");
register(pathToFileURL(path.join(REPO, "scripts/ts-alias-hooks.mjs")).href);

const href = (p) => pathToFileURL(path.join(SRC, p)).href;
const { PROJECTS } = await import(href("content/index.ts"));
const { FOUNDATIONS } = await import(href("content/foundations/index.ts"));

const foundations = {
  id: FOUNDATIONS.slug,
  title: FOUNDATIONS.title,
  blurb: FOUNDATIONS.tagline,
  kind: "foundations",
  parts: FOUNDATIONS.parts.map((p) => ({
    id: p.id,
    title: p.title,
    blurb: p.blurb,
    moduleIds: FOUNDATIONS.modules.filter((m) => m.part === p.id).map((m) => m.id),
  })),
  modules: FOUNDATIONS.modules.map((m) => ({
    id: m.id,
    title: m.title,
    blurb: m.blurb,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      ...(l.level ? { level: l.level } : {}),
      minutes: l.minutes,
      xp: l.xp,
      steps: l.steps.length,
      path: `/learn/${l.id}`,
    })),
  })),
};

const courses = PROJECTS.map((p) => ({
  id: p.slug,
  title: p.title,
  blurb: p.tagline,
  kind: "course",
  language: p.language ?? "python",
  level: p.difficulty,
  ...(p.track ? { track: p.track } : {}),
  modules: p.chapters.map((c) => ({
    id: `${p.slug}/${c.id}`,
    title: c.title,
    blurb: c.blurb,
    lessons: c.lessons.map((l) => ({ id: l.id, title: l.title, level: p.difficulty, minutes: l.minutes, xp: l.xp, path: `/projects/${p.slug}/${l.id}` })),
  })),
}));

const tracks = [foundations, ...courses];
const version = createHash("sha256").update(JSON.stringify(tracks)).digest("hex").slice(0, 12);
const catalog = { version, generatedAt: new Date().toISOString(), tracks, playground: { path: "/playground" } };

const out = path.join(HERE, "../src/fixtures/catalog.json");
mkdirSync(path.dirname(out), { recursive: true });
const json = JSON.stringify(catalog);
writeFileSync(out, json + "\n");
const lessons = tracks.reduce((n, t) => n + t.modules.reduce((m, mod) => m + mod.lessons.length, 0), 0);
console.log(`catalog ${version}: ${tracks.length} tracks, ${lessons} lessons, ${json.length} bytes (${gzipSync(json).length} gzipped) → ${path.relative(process.cwd(), out)}`);
