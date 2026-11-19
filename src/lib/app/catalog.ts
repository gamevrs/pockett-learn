import { createHash } from "node:crypto";
import { PROJECTS } from "@/content";
import { FOUNDATIONS } from "@/content/foundations";
import { visibleParts } from "@/learn/types";
import { languageOf, type Difficulty, type LanguageId } from "@/engine/types";

/**
 * The course catalog the phone app (Expo, branch feat/native-app) draws its lesson lists from: every track, module and
 * lesson with the exact id progress uses (pockett_progress_v2) and the site path the lesson lives at. No lesson bodies:
 * the lessons themselves open in the app's web view at /embed + path. Built from the real content, so it can never drift.
 * Contract: scratchpad native/contract.md, section 1.
 */

export interface CatalogLesson {
  id: string;
  title: string;
  level?: Difficulty;
  minutes?: number;
  xp?: number;
  /** Foundations only: how many steps the player walks through. */
  steps?: number;
  path: string;
}

export interface CatalogModule {
  id: string;
  title: string;
  blurb: string;
  /** Foundations only: lucide icon key (src/learn/module-icons.tsx) and the part it belongs to. */
  icon?: string;
  part?: string;
  lessons: CatalogLesson[];
}

export interface CatalogTrack {
  id: string;
  title: string;
  blurb: string;
  kind: "foundations" | "course";
  language?: LanguageId;
  level?: Difficulty;
  parts?: { id: string; title: string; moduleIds: string[] }[];
  /** Courses only: card art and grouping, as on the site's project picker. */
  emoji?: string;
  accent?: { from: string; to: string };
  hours?: number;
  group?: string;
  modules: CatalogModule[];
}

export interface Catalog {
  version: string;
  generatedAt: string;
  tracks: CatalogTrack[];
  playground: { path: string };
}

function foundationsTrack(): CatalogTrack {
  return {
    id: FOUNDATIONS.slug,
    title: FOUNDATIONS.title,
    blurb: FOUNDATIONS.tagline,
    kind: "foundations",
    parts: visibleParts(FOUNDATIONS).map((p) => ({ id: p.id, title: p.title, moduleIds: FOUNDATIONS.modules.filter((m) => m.part === p.id).map((m) => m.id) })),
    modules: FOUNDATIONS.modules.map((m) => ({
      id: m.id,
      title: m.title,
      blurb: m.blurb,
      icon: m.icon,
      part: m.part,
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
}

function courseTracks(): CatalogTrack[] {
  return PROJECTS.map((p) => ({
    id: p.slug,
    title: p.title,
    blurb: p.tagline,
    kind: "course" as const,
    language: languageOf(p),
    level: p.difficulty,
    emoji: p.emoji,
    accent: p.accent,
    hours: p.hours,
    ...(p.track ? { group: p.track } : {}),
    modules: p.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      blurb: c.blurb,
      lessons: c.lessons.map((l) => ({ id: l.id, title: l.title, minutes: l.minutes, xp: l.xp, path: `/projects/${p.slug}/${l.id}` })),
    })),
  }));
}

/** Every lesson id in the catalog, in order (used by the checks to compare with what progress syncs). */
export function catalogLessonIds(catalog: Catalog): string[] {
  return catalog.tracks.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => l.id)));
}

/** `generatedAt` is passed in so the content part stays a pure function of the content (the version is its hash). */
export function buildCatalog(generatedAt: string): Catalog {
  const tracks = [foundationsTrack(), ...courseTracks()];
  const version = createHash("sha256").update(JSON.stringify(tracks)).digest("hex").slice(0, 16);
  return { version, generatedAt, tracks, playground: { path: "/playground" } };
}
