import type { MetadataRoute } from "next";
import { PROJECTS, allLessonParams } from "@/content";
import { FOUNDATIONS } from "@/content/foundations";
import { trackLessons } from "@/learn/types";
import { SITE_URL } from "@/lib/legal";

type Entry = MetadataRoute.Sitemap[number];

const entry = (path: string, changeFrequency: Entry["changeFrequency"], priority: number): Entry => ({
  url: `${SITE_URL}${path}`,
  changeFrequency,
  priority,
});

/** Public pages only: the account and progress pages are personal and are left out (see robots.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    entry("/", "weekly", 1),
    entry("/learn", "weekly", 0.9),
    entry("/projects", "weekly", 0.9),
    entry("/playground", "monthly", 0.5),
    entry("/brand", "monthly", 0.4),
    entry("/privacy", "yearly", 0.3),
    entry("/terms", "yearly", 0.3),
    ...PROJECTS.map((p) => entry(`/projects/${p.slug}`, "monthly", 0.8)),
    ...allLessonParams().map((p) => entry(`/projects/${p.slug}/${p.lessonId}`, "monthly", 0.6)),
    ...trackLessons(FOUNDATIONS).map((l) => entry(`/learn/${l.id}`, "monthly", 0.7)),
  ];
}
