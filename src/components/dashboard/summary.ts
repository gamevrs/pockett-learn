import { flattenLessons, type Project } from "@/engine/types";
import { trackLessons, type Track } from "@/learn/types";

/**
 * The few fields the progress dashboard renders. The page builds this on the server so the client component
 * never receives lesson text, starter code or checks (the full catalogue is megabytes).
 */
export interface DashboardLesson {
  id: string;
  title: string;
}

export interface DashboardProject {
  slug: string;
  title: string;
  lessons: DashboardLesson[];
}

export interface DashboardSummary {
  projects: DashboardProject[];
  foundations: DashboardLesson[];
}

export function summariseForDashboard(projects: Project[], foundations: Track): DashboardSummary {
  return {
    projects: projects.map((p) => ({
      slug: p.slug,
      title: p.title,
      lessons: flattenLessons(p).map((l) => ({ id: l.id, title: l.title })),
    })),
    foundations: trackLessons(foundations).map((l) => ({ id: l.id, title: l.title })),
  };
}
