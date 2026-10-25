import type { Project } from "@/engine/types";

/**
 * Whitelists what a client may receive: curriculum text and starter code, but never reference
 * solutions, explanations, or test source. New Lesson fields stay private until added here.
 */
export function toPublicProject(project: Project) {
  return {
    slug: project.slug,
    language: project.language ?? "python",
    title: project.title,
    tagline: project.tagline,
    pitch: project.pitch,
    emoji: project.emoji,
    difficulty: project.difficulty,
    hours: project.hours,
    sceneId: project.sceneId,
    accent: project.accent,
    controls: project.controls,
    skills: project.skills,
    features: project.features,
    chapters: project.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      blurb: chapter.blurb,
      lessons: chapter.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        minutes: l.minutes,
        xp: l.xp,
        concepts: l.concepts,
        learn: l.learn,
        mission: l.mission,
        tasks: l.tasks,
        starterAdd: l.starterAdd,
        hints: l.hints,
        checks: l.tests.map((t) => ({ id: t.id, description: t.description })),
        unlocks: l.unlocks,
      })),
    })),
  };
}
