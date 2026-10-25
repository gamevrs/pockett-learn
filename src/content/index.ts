import { flattenLessons, languageOf, type Lesson, type Project, type UpcomingProject } from "@/engine/types";
import { garage } from "./projects/garage";
import { launch } from "./projects/launch";
import { beatlab } from "./projects/beatlab";
import { pitWall } from "./projects/pit-wall";
import { garageJs } from "./projects/garage-js";

/** Every playable project, in the order shown in the picker. */
export const PROJECTS: Project[] = [garage, launch, beatlab, pitWall,garageJs];

/** Teasers shown as "coming soon" cards. */
export const UPCOMING: UpcomingProject[] = [
  { slug: "pixel-pet", title: "Pixel Pet", tagline: "Raise a creature with classes & state machines.", emoji: "🐣", accent: { from: "#ffd23d", to: "#ff8a3d" } },
  { slug: "rover", title: "Mars Rover", tagline: "Program a rover through a canyon with algorithms.", emoji: "🛰️", accent: { from: "#ff7a45", to: "#c2410c" } },
  { slug: "art-studio", title: "Art Studio", tagline: "Generative art with loops and randomness.", emoji: "🎨", accent: { from: "#ff5c9a", to: "#a3e635" } },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export interface LessonContext {
  project: Project;
  lesson: Lesson;
  index: number;
  total: number;
  prev: Lesson | null;
  next: Lesson | null;
  chapterTitle: string;
}

export function getLessonContext(slug: string, lessonId: string): LessonContext | undefined {
  const project = getProject(slug);
  if (!project) return undefined;
  const lessons = flattenLessons(project);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) return undefined;
  const chapter = project.chapters.find((c) => c.lessons.some((l) => l.id === lessonId));
  return {
    project,
    lesson: lessons[index],
    index,
    total: lessons.length,
    prev: lessons[index - 1] ?? null,
    next: lessons[index + 1] ?? null,
    chapterTitle: chapter?.title ?? "",
  };
}

export function allLessonParams(): { slug: string; lessonId: string }[] {
  return PROJECTS.flatMap((p) => flattenLessons(p).map((l) => ({ slug: p.slug, lessonId: l.id })));
}

/** Light-weight project card data for lists and the public API (no solutions or tests). */
export function summarize(project: Project) {
  const lessons = flattenLessons(project);
  return {
    slug: project.slug,
    language: languageOf(project),
    sceneId: project.sceneId,
    title: project.title,
    tagline: project.tagline,
    emoji: project.emoji,
    difficulty: project.difficulty,
    hours: project.hours,
    accent: project.accent,
    skills: project.skills,
    lessonCount: lessons.length,
    totalXp: lessons.reduce((sum, l) => sum + l.xp, 0),
    features: project.features.map(({ id, title, emoji }) => ({ id, title, emoji })),
  };
}
