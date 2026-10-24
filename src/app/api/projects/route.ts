import { PROJECTS, summarize } from "@/content";

/** Public catalog: lightweight project cards (no lesson solutions or tests). */
export function GET() {
  return Response.json({ projects: PROJECTS.map(summarize) });
}
