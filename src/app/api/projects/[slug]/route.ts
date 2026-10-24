import { PROJECTS, getProject } from "@/content";
import { toPublicProject } from "@/content/public";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

/** One project's curriculum for clients that should not receive reference solutions or tests. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  return Response.json(toPublicProject(project));
}
