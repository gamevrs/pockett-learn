import { cacheLife } from "next/cache";
import { buildCatalog } from "@/lib/app/catalog";

/** The phone app's course catalog (see src/lib/app/catalog.ts). Prerendered at build time: it only changes on deploy. */
async function catalog() {
  "use cache";
  cacheLife("max");
  return buildCatalog(new Date().toISOString());
}

export async function GET() {
  return Response.json(await catalog());
}
