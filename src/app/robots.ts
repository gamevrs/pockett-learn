import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // account and progress pages are personal, and the API is not content
      disallow: ["/api/", "/account", "/dashboard"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
